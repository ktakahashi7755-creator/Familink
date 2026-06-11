/**
 * Family data store — the heart of Familink.
 * ------------------------------------------------------------------
 * Holds every shared collection (events, tasks, budget, board, health,
 * shopping, album, hoku chat, profile, premium). Persisted to
 * AsyncStorage via zustand's persist middleware under `familink_v3:family`.
 *
 * This mirrors the web MVP's PERSIST array but as typed slices. When
 * Supabase sync is enabled the same actions can push/pull rows; for now
 * everything is local-first (offline capable), which matches the MVP.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '@/lib/storage';
import { uid } from '@/lib/utils';
import type {
  AlbumFolder,
  AlbumPhoto,
  BoardPost,
  FamilyEvent,
  HealthRecord,
  HokuMessage,
  KanbanColumn,
  Member,
  PremiumState,
  ShoppingItem,
  Task,
  Transaction,
  UserProfile,
} from '@/types';

interface FamilyState {
  hydrated: boolean;

  profile: UserProfile;
  members: Member[];
  events: FamilyEvent[];
  tasks: Task[];
  kanbanCols: KanbanColumn[];
  txs: Transaction[];
  posts: BoardPost[];
  health: HealthRecord[];
  shoppingItems: ShoppingItem[];
  albumPhotos: AlbumPhoto[];
  albumFolders: AlbumFolder[];
  hokuMessages: HokuMessage[];
  premium: PremiumState;

  // profile / family
  setProfile: (p: Partial<UserProfile>) => void;
  addMember: (m: Omit<Member, 'id'>) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  removeMember: (id: string) => void;

  // events
  addEvent: (e: Omit<FamilyEvent, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, patch: Partial<FamilyEvent>) => void;
  removeEvent: (id: string) => void;

  // tasks
  addTask: (t: Omit<Task, 'id' | 'createdAt' | 'done'> & { done?: boolean }) => void;
  toggleTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;

  // budget
  addTx: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  removeTx: (id: string) => void;

  // board
  addPost: (p: Omit<BoardPost, 'id' | 'createdAt'>) => void;
  removePost: (id: string) => void;
  togglePin: (id: string) => void;

  // health
  addHealth: (h: Omit<HealthRecord, 'id' | 'createdAt'>) => void;
  removeHealth: (id: string) => void;

  // shopping
  addShopping: (name: string, memberId?: string) => void;
  toggleShopping: (id: string) => void;
  removeShopping: (id: string) => void;
  clearDoneShopping: () => void;

  // album
  addPhotos: (uris: string[], folderId?: string) => void;
  removePhoto: (id: string) => void;
  addFolder: (name: string) => void;

  // hoku
  pushHokuMessage: (m: Omit<HokuMessage, 'id' | 'createdAt'>) => HokuMessage;
  clearHoku: () => void;

  // premium
  setPremium: (patch: Partial<PremiumState>) => void;
  startTrial: () => void;
}

const DEFAULT_KANBAN: KanbanColumn[] = [
  { id: 'todo', title: 'やること' },
  { id: 'doing', title: '進行中' },
  { id: 'done', title: '完了' },
];

const now = () => new Date().toISOString();

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      hydrated: false,

      profile: { name: '' },
      members: [],
      events: [],
      tasks: [],
      kanbanCols: DEFAULT_KANBAN,
      txs: [],
      posts: [],
      health: [],
      shoppingItems: [],
      albumPhotos: [],
      albumFolders: [],
      hokuMessages: [],
      premium: { isPremiumUser: false, premiumPaid: false },

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      addMember: (m) => set((s) => ({ members: [...s.members, { ...m, id: uid('mem_') }] })),
      updateMember: (id, patch) =>
        set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMember: (id) => set((s) => ({ members: s.members.filter((m) => m.id !== id) })),

      addEvent: (e) =>
        set((s) => ({ events: [...s.events, { ...e, id: uid('evt_'), createdAt: now() }] })),
      updateEvent: (id, patch) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      addTask: (t) =>
        set((s) => ({
          tasks: [
            ...s.tasks,
            { done: false, column: 'todo', ...t, id: uid('tsk_'), createdAt: now() },
          ],
        })),
      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, done: !t.done, column: !t.done ? 'done' : 'todo' } : t,
          ),
        })),
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addTx: (t) => set((s) => ({ txs: [{ ...t, id: uid('tx_'), createdAt: now() }, ...s.txs] })),
      removeTx: (id) => set((s) => ({ txs: s.txs.filter((t) => t.id !== id) })),

      addPost: (p) =>
        set((s) => ({ posts: [{ ...p, id: uid('post_'), createdAt: now() }, ...s.posts] })),
      removePost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
      togglePin: (id) =>
        set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p)) })),

      addHealth: (h) =>
        set((s) => ({ health: [{ ...h, id: uid('hl_'), createdAt: now() }, ...s.health] })),
      removeHealth: (id) => set((s) => ({ health: s.health.filter((h) => h.id !== id) })),

      addShopping: (name, memberId) =>
        set((s) => ({
          shoppingItems: [
            { id: uid('shp_'), name, done: false, memberId, createdAt: now() },
            ...s.shoppingItems,
          ],
        })),
      toggleShopping: (id) =>
        set((s) => ({
          shoppingItems: s.shoppingItems.map((i) =>
            i.id === id ? { ...i, done: !i.done } : i,
          ),
        })),
      removeShopping: (id) =>
        set((s) => ({ shoppingItems: s.shoppingItems.filter((i) => i.id !== id) })),
      clearDoneShopping: () =>
        set((s) => ({ shoppingItems: s.shoppingItems.filter((i) => !i.done) })),

      addPhotos: (uris, folderId) =>
        set((s) => ({
          albumPhotos: [
            ...uris.map((uri) => ({ id: uid('ph_'), uri, folderId, createdAt: now() })),
            ...s.albumPhotos,
          ],
        })),
      removePhoto: (id) => set((s) => ({ albumPhotos: s.albumPhotos.filter((p) => p.id !== id) })),
      addFolder: (name) =>
        set((s) => ({ albumFolders: [...s.albumFolders, { id: uid('fld_'), name }] })),

      pushHokuMessage: (m) => {
        const msg: HokuMessage = { ...m, id: uid('hk_'), createdAt: now() };
        set((s) => ({ hokuMessages: [...s.hokuMessages, msg] }));
        return msg;
      },
      clearHoku: () => set({ hokuMessages: [] }),

      setPremium: (patch) => set((s) => ({ premium: { ...s.premium, ...patch } })),
      startTrial: () =>
        set((s) => ({
          premium: { ...s.premium, trialStartedAt: s.premium.trialStartedAt ?? now() },
        })),
    }),
    {
      name: 'family',
      storage: createJSONStorage(() => asyncStorageAdapter),
      onRehydrateStorage: () => () => {
        // Runs after the persisted state has been merged in.
        useFamilyStore.setState({ hydrated: true });
      },
      // `hydrated` is a transient flag — never persist it.
      partialize: ({ hydrated: _hydrated, ...rest }) => rest,
    },
  ),
);
