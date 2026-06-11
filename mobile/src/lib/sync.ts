/**
 * Supabase family sync (β).
 * ------------------------------------------------------------------
 * Pushes local items to `familink_items` and pulls the family's rows back,
 * merging additively by id (last-write-wins on conflict). Opt-in and
 * manual for now — no auto-run — so local-first data is never surprised.
 *
 * Requires a signed-in Supabase session. The family scope is
 * `useFamilyStore.familyId` or, if unset, the user's own id (solo family).
 * See ../../supabase/familink-mobile-schema.sql for the table + RLS.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { useFamilyStore, type MergeableKey } from '@/store/useFamilyStore';

const SYNCED_KINDS: MergeableKey[] = [
  'events',
  'tasks',
  'txs',
  'posts',
  'health',
  'shoppingItems',
  'members',
  'prep',
  'memos',
];

interface ItemRow {
  id: string;
  family_id: string;
  kind: string;
  data: Record<string, unknown>;
  updated_at: string;
  deleted: boolean;
}

export interface SyncResult {
  ok: boolean;
  pushed: number;
  pulled: number;
  error?: string;
}

async function resolveFamilyId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  return useFamilyStore.getState().familyId ?? data.session.user.id;
}

export async function fullSync(): Promise<SyncResult> {
  const familyId = await resolveFamilyId();
  if (!familyId) return { ok: false, pushed: 0, pulled: 0, error: 'ログインが必要です' };

  const store = useFamilyStore.getState();
  const nowIso = new Date().toISOString();

  // Ensure membership row exists (so RLS lets us read shared rows).
  await supabase.from('familink_members').upsert({ family_id: familyId }, { onConflict: 'family_id,user_id' });

  // --- push ---
  const rows: Omit<ItemRow, 'deleted'>[] = [];
  for (const kind of SYNCED_KINDS) {
    const items = store[kind] as { id: string }[];
    for (const item of items) {
      rows.push({ id: item.id, family_id: familyId, kind, data: item as Record<string, unknown>, updated_at: nowIso });
    }
  }
  let pushed = 0;
  if (rows.length) {
    const { error } = await supabase.from('familink_items').upsert(rows, { onConflict: 'id' });
    if (error) return { ok: false, pushed: 0, pulled: 0, error: error.message };
    pushed = rows.length;
  }

  // --- pull ---
  const { data, error } = await supabase
    .from('familink_items')
    .select('*')
    .eq('family_id', familyId)
    .eq('deleted', false);
  if (error) return { ok: false, pushed, pulled: 0, error: error.message };

  const byKind = new Map<MergeableKey, Record<string, unknown>[]>();
  for (const row of (data ?? []) as ItemRow[]) {
    if (!SYNCED_KINDS.includes(row.kind as MergeableKey)) continue;
    const k = row.kind as MergeableKey;
    (byKind.get(k) ?? byKind.set(k, []).get(k)!).push(row.data);
  }
  let pulled = 0;
  byKind.forEach((items, kind) => {
    pulled += items.length;
    store.mergeRemote(kind, items as never);
  });

  return { ok: true, pushed, pulled };
}

/**
 * Subscribe to a family's item changes and apply them to the local store in
 * real time (insert/update → merge, soft-delete → remove). Returns an
 * unsubscribe function. Mirrors the web app's `familink_family_${id}` idea.
 */
export function subscribeFamily(familyId: string): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`familink_family_${familyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'familink_items', filter: `family_id=eq.${familyId}` },
      (payload) => {
        const row = payload.new as ItemRow | undefined;
        if (!row || !SYNCED_KINDS.includes(row.kind as MergeableKey)) return;
        const kind = row.kind as MergeableKey;
        if (row.deleted) {
          removeLocal(kind, row.id);
        } else {
          useFamilyStore.getState().mergeRemote(kind, [row.data] as never);
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

function removeLocal(kind: MergeableKey, id: string) {
  const state = useFamilyStore.getState();
  const arr = state[kind] as { id: string }[];
  useFamilyStore.setState({ [kind]: arr.filter((x) => x.id !== id) } as never);
}
