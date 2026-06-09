// ============================================================
// Familink 予定表スキャン — OpenAI Vision バックエンド（Supabase Edge Function / Deno）
//
// 役割：アプリ(HTML)から来る {image, year, month, existing} を OpenAI Vision に渡し、
//       園・学校・習い事の予定表/お便り/給食表の写真から「予定候補(JSON)」を抽出して返す。
//   - 鍵は必ずサーバ側（環境変数 OPENAI_API_KEY＝既存 Hoku と共通の Secret を流用）。
//     アプリ／Git には絶対に出さない。
//   - Hoku 関数とは完全に別エンドポイント（/functions/v1/calendar-scan）。Hoku には触れない。
//   - 返却（アプリの normalizeOcrEvents が解釈する形）:
//       { events: [eventCandidate...], warnings: string[], rawText: string, confidence: number }
//       eventCandidate = { title, date(YYYY-MM-DD), allDay, startTime(HH:MM|""), endTime,
//                          location, notes, confidence(0..1), warnings:string[], originalText }
//
// 認証（ゼロ設定方針・Hoku と同じ）:
//   既定は Supabase の JWT 検証に任せる（= --no-verify-jwt を付けずにデプロイ）。
//   「ログイン中の Familink ユーザー」だけが到達でき、アプリは関数名 invoke で
//   ユーザーの JWT と anon キーを自動付与（URL も合言葉も不要）。OpenAI 課金の不正利用を防ぐ。
//
// デプロイ（推奨・ゼロ設定）:
//   # OPENAI_API_KEY は既存 Hoku 用に登録済みのものをそのまま共通利用（再設定不要）
//   supabase functions deploy calendar-scan          # ← --no-verify-jwt は付けない（JWT検証ON）
//   （任意）CALENDAR_SCAN_SHARED_KEY を設定すると x-cal-key 一致も追加で要求（独自URL直叩き用）
//   （任意）CALENDAR_SCAN_MODEL で Vision モデルを上書き（既定 gpt-4o-mini）
// ============================================================

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";          // ★ Hoku と共通の Secret
const SHARED_KEY = Deno.env.get("CALENDAR_SCAN_SHARED_KEY") || "";
const MODEL = Deno.env.get("CALENDAR_SCAN_MODEL") || "gpt-4o-mini";   // Vision 対応・安価

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // supabase-js(ブラウザ invoke) が送るヘッダを許可（preflight ブロック回避）
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cal-key, x-supabase-api-version",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// 抽出ルール（園/学校/習い事の予定表・お便り・給食表・行事予定に対応）。推測で増やさない。
const SYSTEM_PROMPT = `あなたは日本の幼稚園・保育園・小学校・習い事の「予定表／お便り／給食表／行事予定」の写真から、
カレンダー登録用の予定を正確に抽出するアシスタントです。

厳守事項:
- 写真に実際に書かれている予定だけを抽出する。推測で予定を増やさない。読めない箇所は warnings に記す。
- 日付は必ず YYYY-MM-DD。年が写真に無ければ context.year を使う。月が無ければ context.month を使う。
- 年間予定表(4月〜翌3月)の場合、1〜3月は学校年度の翌年(context.year+1)として解釈する。
- 時刻は HH:MM(24時間)。開始だけのものは endTime を空にする。時刻が無い行事は allDay=true・startTime/endTime を空にする。
- 「午前保育」「短縮授業」「給食なし」「振替休日」「個人面談」「避難訓練」「参観日」等はそのまま自然なタイトルにする。
- 「水筒」「上履き」「体操服」「お弁当」「レジャーシート」等の持ち物は notes にまとめる。
- 場所が書かれていれば location に入れる。
- 各予定に confidence(0〜1) を付ける。読み取りが曖昧なら下げ、warnings に短い日本語で理由を入れる
  （例:「終了時間を確認してください」「日付が不明瞭です」「曜日が一致しません」）。
- originalText に、その予定の根拠となった写真内の文字列を可能な範囲で入れる。

出力は必ず次のJSONのみ（コードブロックや説明文を付けない）:
{
  "events": [
    {
      "title": "遠足",
      "date": "2026-06-15",
      "allDay": true,
      "startTime": "",
      "endTime": "",
      "location": "",
      "notes": "持ち物：水筒・帽子・お弁当",
      "confidence": 0.92,
      "warnings": [],
      "originalText": "6/15 遠足 お弁当・水筒持参"
    }
  ],
  "rawText": "写真から読み取れた全テキスト（改行込み・分かる範囲で）",
  "confidence": 0.0
}
予定が1件も見つからなければ events を空配列にし、rawText に読み取れた文字を入れる。`;

type OpenAIResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; reason: string; status?: number };

async function callOpenAIVision(imageUrl: string, userText: string): Promise<OpenAIResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000); // Vision は遅いので長めに。無応答は打ち切り
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
            ],
          },
        ],
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    const aborted = (e as Error)?.name === "AbortError";
    console.error("OpenAI fetch failed", aborted ? "timeout" : (e as Error)?.message);
    return { ok: false, reason: aborted ? "openai_timeout" : "network_error" };
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("OpenAI error", res.status, errText);
    let reason = "ai_error";
    if (res.status === 401) reason = "invalid_api_key";
    else if (res.status === 429) reason = /insufficient_quota/i.test(errText) ? "insufficient_quota" : "rate_limited";
    else if (res.status >= 500) reason = "openai_unavailable";
    return { ok: false, reason, status: res.status };
  }
  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return { ok: false, reason: "empty_response" };
  try {
    return { ok: true, data: JSON.parse(content) };
  } catch (_) {
    return { ok: false, reason: "bad_ai_json" };
  }
}

// AI 生出力をアプリが期待する eventCandidate 形へ軽く整える（最終正規化はフロントの normalizeOcrEvents が担う）
function sanitizeEvents(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  const out: Record<string, unknown>[] = [];
  for (const e of raw.slice(0, 60)) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    const allDay = !!o.allDay;
    out.push({
      title: String(o.title ?? "").slice(0, 120),
      date: String(o.date ?? "").slice(0, 10),
      allDay,
      startTime: allDay ? "" : String(o.startTime ?? "").slice(0, 8),
      endTime: allDay ? "" : String(o.endTime ?? "").slice(0, 8),
      location: String(o.location ?? "").slice(0, 120),
      notes: String(o.notes ?? "").slice(0, 500),
      confidence: typeof o.confidence === "number" ? Math.max(0, Math.min(1, o.confidence)) : 0.7,
      warnings: Array.isArray(o.warnings) ? o.warnings.map((w) => String(w).slice(0, 120)).slice(0, 8) : [],
      originalText: String(o.originalText ?? "").slice(0, 300),
    });
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // 認証：本番は Supabase の JWT 検証（verify_jwt=ON）で「ログイン中ユーザー」だけが到達。
  // 互換：CALENDAR_SCAN_SHARED_KEY を設定した場合のみ、x-cal-key 一致も追加で要求（独自URL直叩き用）。
  if (SHARED_KEY && (req.headers.get("x-cal-key") || "") !== SHARED_KEY) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!OPENAI_API_KEY) return json({ error: "server_misconfigured: OPENAI_API_KEY 未設定" }, 500);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { return json({ error: "bad_json" }, 400); }

  // 画像（data URL もしくは素の base64）。サイズ上限でガード（過大入力＝課金/遅延の暴発を防ぐ）。
  let image = String(body.image ?? "");
  if (!image) return json({ error: "no_image" }, 400);
  if (!image.startsWith("data:")) image = "data:image/jpeg;base64," + image;
  if (image.length > 8_000_000) return json({ error: "image_too_large" }, 413); // ~6MB 相当

  const now = new Date();
  const year = Number(body.year) || now.getFullYear();
  const month = Number(body.month) || (now.getMonth() + 1);
  const existing = Array.isArray(body.existing) ? body.existing.slice(0, 50) : [];

  const userText =
    `この写真は家族の予定表です。次の文脈で予定を抽出してください。\n` +
    `context.year=${year}\ncontext.month=${month}\n` +
    `既存の予定（重複参考・抽出対象ではない）:\n` +
    JSON.stringify(existing).slice(0, 1500) +
    `\n\n写真内の全ての予定を、指定のJSON形式だけで返してください。`;

  const result = await callOpenAIVision(image, userText);
  if (!result.ok) return json({ error: "ai_failed", reason: result.reason }, 502);

  const out = result.data;
  const events = sanitizeEvents(out.events);
  return json({
    events,
    warnings: Array.isArray(out.warnings) ? out.warnings.map((w) => String(w).slice(0, 160)).slice(0, 10) : [],
    rawText: typeof out.rawText === "string" ? out.rawText.slice(0, 4000) : "",
    confidence: typeof out.confidence === "number" ? Math.max(0, Math.min(1, out.confidence)) : (events.length ? 0.8 : 0.0),
  });
});
