/**
 * Hoku AI client.
 * ------------------------------------------------------------------
 * Mirrors the web MVP contract: POST {text, context, history} to the
 * Supabase Edge Function `hoku`, which proxies OpenAI server-side
 * (the API key never lives in the client). Response:
 *   { reply, intent, confidence, entities }
 *
 * When the user isn't signed in to Supabase (local mode) or the function
 * is unreachable, we fall back to a small offline assistant so Hoku always
 * responds gracefully.
 */
import { supabase } from '@/lib/supabase';
import type { HokuMessage } from '@/types';

export type HokuIntent =
  | 'calendar_add'
  | 'task_add'
  | 'shopping_add'
  | 'budget_add'
  | 'health_add'
  | 'board_post_add'
  | 'calendar_view'
  | 'task_view'
  | 'shopping_view'
  | 'unknown';

export interface HokuEntities {
  title?: string;
  date?: string;
  time?: string;
  member?: string;
  amount?: number;
  txType?: 'income' | 'expense';
  category?: string;
  temperature?: string;
  symptoms?: string[];
}

export interface HokuReply {
  reply: string;
  intent: HokuIntent;
  confidence: number;
  entities: HokuEntities;
  offline?: boolean;
}

export interface HokuContext {
  today: string;
  members: string[];
  events: { date: string; title: string; start?: string }[];
  tasks: { title: string; done: boolean }[];
  shopping: { name: string; done: boolean }[];
}

export async function askHoku(
  text: string,
  context: HokuContext,
  history: HokuMessage[],
): Promise<HokuReply> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return offlineReply(text, context);
  }

  try {
    const { data, error } = await supabase.functions.invoke('hoku', {
      body: {
        text,
        context,
        history: history.slice(-8).map((m) => ({ role: m.role, content: m.text })),
      },
    });
    if (error || !data) return offlineReply(text, context);
    const d = data as Partial<HokuReply>;
    return {
      reply: d.reply?.trim() || 'うん、聞いてるよ。',
      intent: (d.intent as HokuIntent) ?? 'unknown',
      confidence: d.confidence ?? 0.5,
      entities: d.entities ?? {},
    };
  } catch {
    return offlineReply(text, context);
  }
}

/** A lightweight rule-based fallback so the app is useful without a backend. */
function offlineReply(text: string, context: HokuContext): HokuReply {
  if (/(今日|きょう).*(予定|よてい)|予定.*教え|予定.*ある/.test(text)) {
    const todays = context.events.filter((e) => e.date === context.today);
    if (todays.length === 0) {
      return wrap('今日は予定なし、ゆっくりしてね。', 'calendar_view');
    }
    const lines = todays.map((e) => `・${e.start ? e.start + '〜 ' : ''}${e.title}`).join('\n');
    return wrap(`今日の予定はこれだよ！\n\n${lines}`, 'calendar_view');
  }

  if (/買っ|買い物|ショッピング/.test(text)) {
    const left = context.shopping.filter((s) => !s.done);
    if (left.length === 0) return wrap('買い物リストは空っぽだよ。', 'shopping_view');
    const lines = left.map((s) => `・${s.name}`).join('\n');
    return wrap(`買うものはこれだよ！\n\n${lines}`, 'shopping_view');
  }

  if (/(やること|タスク|todo)/i.test(text)) {
    const open = context.tasks.filter((s) => !s.done);
    if (open.length === 0) return wrap('未完了のタスクはないよ。お疲れさま！', 'task_view');
    const lines = open.map((s) => `・${s.title}`).join('\n');
    return wrap(`やることはこれだよ！\n\n${lines}`, 'task_view');
  }

  return wrap(
    'ごめん、いまオフラインで簡単な受け答えだけできるよ。ログインすると予定の追加までお手伝いできるよ。',
    'unknown',
  );
}

function wrap(reply: string, intent: HokuIntent): HokuReply {
  return { reply, intent, confidence: 0.6, entities: {}, offline: true };
}
