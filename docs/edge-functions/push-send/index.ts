// Familink Web Push 送信 Edge Function（Supabase / Deno）
// ─────────────────────────────────────────────────────────────
// 役割:
//   1) mode:'test' … 動作確認用。指定ユーザー/購読へ即時にテスト通知を送る。
//   2) mode:'scan'（既定・cron から定期実行）… fl_family_data の予定(events)を走査し、
//      各予定の「通知（remind 分前）」が“今この時刻に到来したもの”だけを、家族の購読へ送る。
//      fl_push_log で重複送信を防ぐ。無効化された購読(404/410)は自動削除。
//
// 必要な環境変数（Supabase の Edge Function シークレット / SUPABASE_* は既定で注入）:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT(例 mailto:admin@its.example),
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// デプロイ: supabase functions deploy push-send --no-verify-jwt
// 定期実行(pg_cron)例（5分毎・scan）は docs/WEB-PUSH-SETUP.md 参照。
// ※本ファイルはローカルでは実行検証できないため、デプロイ後に mode:'test' で疎通確認してください。
// ─────────────────────────────────────────────────────────────
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')     ?? 'mailto:admin@example.com'
const SB_URL     = Deno.env.get('SUPABASE_URL')!
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
const sb = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } })

const JST_OFFSET_MIN = 9 * 60 // Familink は JST 前提

type Sub = { endpoint: string; user_id: string; family_id: string | null; p256dh: string; auth: string }
type Ev  = {
  id: string; title: string; date: string; time?: string; allDay?: boolean;
  member?: string; repeat?: string; repeatUnit?: string; repeatInterval?: number;
  repeatUntil?: string; remind?: string | number;
}

// ── JST ヘルパー（UTC の Date を +9h ずらして getUTC* で JST として読む）──
function nowJst(): Date { return new Date(Date.now() + JST_OFFSET_MIN * 60000) }
function ymd(d: Date): string {
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0')
}

// ── 繰り返し判定（アプリの _occursOn を移植）──
function occursOn(e: Ev, ds: string): boolean {
  if (!e || !e.date || !ds) return false
  if (e.date === ds) return true
  const rep = e.repeat
  if (!rep) return false
  if (ds < e.date) return false
  if (e.repeatUntil && ds > e.repeatUntil) return false
  const a = Date.parse(e.date + 'T00:00:00Z'), b = Date.parse(ds + 'T00:00:00Z')
  const days = Math.round((b - a) / 86400000)
  if (days <= 0) return false
  const bd = new Date(b), ad = new Date(a)
  if (rep === 'daily') return true
  if (rep === 'weekdays') return bd.getUTCDay() !== 0 && bd.getUTCDay() !== 6
  if (rep === 'weekly') return days % 7 === 0
  if (rep === 'monthly') return bd.getUTCDate() === ad.getUTCDate()
  if (rep === 'yearly') return bd.getUTCDate() === ad.getUTCDate() && bd.getUTCMonth() === ad.getUTCMonth()
  if (rep === 'custom') {
    const n = Math.max(1, parseInt(String(e.repeatInterval), 10) || 1)
    const u = e.repeatUnit
    if (u === 'day') return days % n === 0
    if (u === 'week') return days % (7 * n) === 0
    if (u === 'month') { if (bd.getUTCDate() !== ad.getUTCDate()) return false; const mo = (bd.getUTCFullYear() - ad.getUTCFullYear()) * 12 + (bd.getUTCMonth() - ad.getUTCMonth()); return mo > 0 && mo % n === 0 }
    if (u === 'year') { if (bd.getUTCDate() !== ad.getUTCDate() || bd.getUTCMonth() !== ad.getUTCMonth()) return false; const yr = bd.getUTCFullYear() - ad.getUTCFullYear(); return yr > 0 && yr % n === 0 }
  }
  return false
}

async function sendToSub(s: Sub, payload: Record<string, unknown>): Promise<void> {
  try {
    await webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      JSON.stringify(payload)
    )
  } catch (err) {
    const code = (err as { statusCode?: number })?.statusCode
    if (code === 404 || code === 410) {
      // 失効した購読は削除
      await sb.from('fl_push_subscriptions').delete().eq('endpoint', s.endpoint)
    } else {
      console.error('[push] send error', code, (err as Error)?.message)
    }
  }
}

// ── テスト送信 ──
async function handleTest(body: { user_id?: string; endpoint?: string; title?: string; msg?: string; url?: string }) {
  let q = sb.from('fl_push_subscriptions').select('*')
  if (body.endpoint) q = q.eq('endpoint', body.endpoint)
  else if (body.user_id) q = q.eq('user_id', body.user_id)
  const { data: subs, error } = await q
  if (error) return { ok: false, error: error.message }
  const payload = { title: body.title || 'Familink（テスト）', body: body.msg || 'プッシュ通知が届いています。', url: body.url || './', tag: 'fl-test' }
  await Promise.all((subs ?? []).map((s) => sendToSub(s as Sub, payload)))
  return { ok: true, sent: subs?.length ?? 0 }
}

// ── 予定リマインドの定期スキャン ──
async function handleScan() {
  const now = nowJst()
  const nowMin = now.getTime()
  const today = ymd(now)
  // cron 5分毎を想定し、6分の窓で「通知時刻が今到来した予定」を拾う（取りこぼしと重複の両立）
  const WINDOW_MS = 6 * 60000

  // 予定を全件取得（fl_family_data の data_key='events'）
  const { data: rows, error } = await sb
    .from('fl_family_data')
    .select('user_id,family_id,payload')
    .eq('data_key', 'events')
  if (error) return { ok: false, error: error.message }

  // 購読を全件取得し、family_id / user_id でグルーピング
  const { data: subs } = await sb.from('fl_push_subscriptions').select('*')
  const byFamily = new Map<string, Sub[]>()
  const byUser = new Map<string, Sub[]>()
  for (const s of (subs ?? []) as Sub[]) {
    if (s.family_id) { const a = byFamily.get(s.family_id) ?? []; a.push(s); byFamily.set(s.family_id, a) }
    const u = byUser.get(s.user_id) ?? []; u.push(s); byUser.set(s.user_id, u)
  }

  let sent = 0
  for (const row of rows ?? []) {
    const events: Ev[] = Array.isArray(row.payload) ? row.payload : []
    // 宛先：家族があれば家族全員の購読、なければ所有者の購読
    const targets: Sub[] = row.family_id ? (byFamily.get(row.family_id) ?? []) : (byUser.get(row.user_id) ?? [])
    if (!targets.length) continue

    for (const e of events) {
      if (!e || !e.time || e.allDay) continue
      const remind = (e.remind === undefined || e.remind === null) ? 30 : parseInt(String(e.remind), 10)
      if (e.remind === '' || isNaN(remind)) continue
      if (!occursOn(e, today)) continue
      const [hh, mm] = String(e.time).split(':').map((x) => parseInt(x, 10))
      if (isNaN(hh) || isNaN(mm)) continue
      // 今日の開始時刻(JST) - remind分 = 通知時刻。UTC基準の nowJst と揃えるため date+time を JST として解釈
      const startJst = Date.parse(today + 'T' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':00Z')
      const notifyAt = startJst - remind * 60000
      if (notifyAt > nowMin || notifyAt < nowMin - WINDOW_MS) continue // 窓の外はスキップ

      const key = `${row.family_id || row.user_id}:${e.id}:${today}:${remind}`
      const { error: logErr } = await sb.from('fl_push_log').insert({ key })
      if (logErr) continue // 23505=既送信 → スキップ

      const when = remind === 0 ? 'まもなく' : (remind >= 1440 ? '明日' : (remind >= 60 ? Math.round(remind / 60) + '時間後' : remind + '分後'))
      const payload = { title: '予定のお知らせ', body: `${when}：${e.time} ${e.title}`, url: './', tag: 'fl-ev-' + e.id }
      await Promise.all(targets.map((s) => sendToSub(s, payload)))
      sent += targets.length
    }
  }
  return { ok: true, sent }
}

Deno.serve(async (req) => {
  try {
    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* cron からは空 body */ }
    const mode = (body.mode as string) || 'scan'
    const result = mode === 'test' ? await handleTest(body) : await handleScan()
    return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
})
