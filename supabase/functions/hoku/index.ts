// ============================================================
// Familink Hoku — OpenAI バックエンド（Supabase Edge Function / Deno）
//
// 役割：アプリ(HTML)から来る {text, context, history} を OpenAI に渡し、
//       Hoku の人格で「短い自然文の返答」＋（登録系なら）構造化 intent/entities を返す。
//   - 鍵は必ずサーバ側（環境変数 OPENAI_API_KEY）。アプリ／Gitには出さない。
//   - エンドポイント（アプリの呼び出し規約に合わせる）:
//       POST .../hoku/api/hoku/chat    → { reply, intent, entities }
//       POST .../hoku/api/hoku/intent  → { intent, confidence }
//     （Supabase は /functions/v1/hoku 配下の全パスをこの関数に渡すため req.url で判定）
//
// 認証（ゼロ設定方針）:
//   既定は Supabase の JWT 検証に任せる（= --no-verify-jwt を付けずにデプロイ）。
//   こうすると「ログイン中の Familink ユーザー」だけがこの関数に到達でき、
//   アプリ側は URL も合言葉も手入力不要（フロントは関数名 invoke で自動的に
//   ユーザーの JWT と anon キーを付与）。OpenAI 課金の不正利用は認証で防ぐ。
//
// デプロイ（推奨・ゼロ設定）:
//   supabase secrets set OPENAI_API_KEY=sk-...      # 鍵はサーバ秘密のみ
//   supabase functions deploy hoku                  # ← --no-verify-jwt は付けない（JWT検証ON）
//   （任意）HOKU_SHARED_KEY を設定すると x-hoku-key 一致も追加で要求（独自URL直叩き用）
// ============================================================

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const HOKU_SHARED_KEY = Deno.env.get("HOKU_SHARED_KEY") || "";
const MODEL = Deno.env.get("HOKU_MODEL") || "gpt-4o-mini"; // 安価＆十分賢い既定

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-hoku-key, authorization, apikey",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// Hoku の人格・話し方（既存アプリのトーンを崩さない：あたたかく短い・日本語・家族の秘書役）
const SYSTEM_PROMPT = `あなたは家族向けアプリ「Familink」のアシスタント「Hoku」です。
3児パパ・ママ・祖父母など家族みんなの段取りをそっと支える、やさしく頼れる秘書役。

話し方（厳守・既存のトーンを崩さない）:
- 日本語。あたたかく親しみやすい、少しラフなタメ語まじりの丁寧さ（例:「OK、入れておくね」「明日は〇〇があるよ」「いいね、それ楽しみだね」）。
- 雑談・相談・確認はとても短く（1〜3文）。説明くさい言い回しや前置きはしない。絵文字は基本使わない（使っても1つまで）。
- 禁止語:「承知しました」「かしこまりました」「超おすすめ」。堅い敬語にしない。
- 家族の味方。急かさない・否定しない・安心感。先回りしてそっと支える。
- 推測で埋めない。context にある実データだけで答える（無いものは正直に「まだ無いよ」と言う）。
- 医療/お金/育児は「記録と整理の手伝い」。診断・断定・専門助言はしない。心配な体調は受診や#7119をやさしく促す。

一覧の見せ方（予定・タスク・買い物・準備・体調などの "見る系" 質問のとき・重要）:
- 「短いひと言 → 改行 → 箇条書き」で見やすくする。だらだらした文章で並べない。
- 1行目は親しみのある短い導入（例:「今日のタスクはこの内容だよ！」「明日の予定、これだけあるよ」）。
- 2行目以降は項目を改行(\\n)で区切った箇条書き。各行は「・」で始める。
- 時刻があるものは「・HH:MM〜 内容」、無いものは「・内容」。担当の人がいれば「内容（名前）」と添える。
- 近い順・時間順に並べる。多すぎるときは主要な数件に絞り、最後に「ほかにも○件あるよ」と一言。
- 該当が無いときは箇条書きにせず、短く「今日は予定なし、ゆっくりしてね」のように返す。
- 例（reply の中身。\\n が改行）:
  今日のタスクはこの内容だよ！\\n\\n・10:00〜 星斗小学校お迎え\\n・12:00〜 ランチ代用意\\n・16:00〜 星愛ちゃんと焼肉きんぐ\\n・19:00〜 明日の子供達の準備

文脈の使い方:
- context（today, members, 予定/タスク/買い物/準備/体調/メモ など）と history（直前までの会話）を必ず踏まえて、前の話の続きとして自然に答える。
- 相対日付（明日/来週/金曜 など）は context.today を基準に YYYY-MM-DD へ解決する。
- メンバー名は context.members / membersDetail の表記に合わせる。

登録の手伝い（重要）:
- ユーザーが「予定/タスク/買い物/準備/体調/家計/お知らせ などを追加・登録したい」場合は、reply に短い確認のひと言を入れつつ、intent と entities を返す。
- 追加ではなく質問・相談・雑談なら intent は "unknown" にして reply だけ返す。

返答は必ず次のJSONのみ:
{
  "reply": "ユーザーへの返答（必須。雑談は短文／見る系は『短い導入＋改行＋箇条書き』）",
  "intent": "下記のどれか",
  "confidence": 0.0〜1.0,
  "entities": { "title": "", "date": "YYYY-MM-DD", "time": "HH:MM", "member": "名前", "amount": 0, "txType": "income|expense", "category": "", "temperature": "", "subject": "", "medicine": "", "symptoms": [], "weekday": 0 }
}
weekday は「毎週○曜」のような繰り返し（prep_routine_add / recurring_budget_add）のときだけ 0=日,1=月,2=火,3=水,4=木,5=金,6=土 の数値で入れる。
intent候補: calendar_add, task_add, budget_add, recurring_budget_add, prep_add, prep_routine_add, health_add, board_post_add, notification_add, shopping_add, shopping_frequent_add, shopping_purchased, calendar_view, task_view, budget_view, health_view, prep_view, shopping_view, unknown
entities は該当する項目だけ入れればよい（無い項目は省略可）。`;

// OpenAI 呼び出し。成功時は {ok:true, data}、失敗時は {ok:false, reason} を返す。
// reason は「APIキーを絶対に含めない」安全な分類のみ（診断で原因特定に使う）。
type OpenAIResult = { ok: true; data: Record<string, unknown> } | { ok: false; reason: string; status?: number };
async function callOpenAI(messages: unknown[]): Promise<OpenAIResult> {
  // OpenAI が遅い／無応答のときはサーバ側でも打ち切る（関数のハング・無駄な課金時間を防ぐ）。
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
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
        messages,
        temperature: 0.4,
        max_tokens: 500,
        response_format: { type: "json_object" },
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
    // ステータス＋本文から原因を安全に分類（APIキーは含めない）。
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
    // JSON でなければ素のテキストを reply として扱う
    return { ok: true, data: { reply: String(content).slice(0, 600), intent: "unknown", confidence: 0.3 } };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // 認証：本番は Supabase の JWT 検証（デプロイ時 verify_jwt=ON）で「ログイン中ユーザー」だけが到達。
  //       アプリは関数名 invoke でユーザーJWTを自動付与するため、設定不要で安全。
  // 互換：HOKU_SHARED_KEY を設定した場合のみ、x-hoku-key 一致も追加で要求（独自URLの直叩き用）。
  if (HOKU_SHARED_KEY && (req.headers.get("x-hoku-key") || "") !== HOKU_SHARED_KEY) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!OPENAI_API_KEY) return json({ error: "server_misconfigured: OPENAI_API_KEY 未設定" }, 500);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { return json({ error: "bad_json" }, 400); }

  const text = String((body.text ?? "")).trim();
  if (!text) return json({ error: "empty_text" }, 400);

  // モード判定：body.mode（関数名 invoke 経由）優先、無ければパス（独自URL直叩き）で判定。
  const wantIntentOnly = body.mode === "intent" || new URL(req.url).pathname.endsWith("/api/hoku/intent");
  const context = body.context ?? {};
  const history = Array.isArray(body.history) ? body.history : [];

  const messages: unknown[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: "現在の家族の文脈(JSON):\n" + JSON.stringify(context).slice(0, 6000) },
  ];
  for (const h of history.slice(-12)) {
    const role = (h as any)?.role === "assistant" ? "assistant" : "user";
    const content = String((h as any)?.content ?? "").slice(0, 800);
    if (content) messages.push({ role, content });
  }
  messages.push({ role: "user", content: text });

  const result = await callOpenAI(messages);
  // reason を返すことで、アプリの #qa-debug 診断が「残高不足／鍵不正／タイムアウト」等を特定できる。
  if (!result.ok) return json({ error: "ai_failed", reason: result.reason }, 502);
  const out = result.data;

  if (wantIntentOnly) {
    return json({
      intent: typeof out.intent === "string" ? out.intent : "unknown",
      confidence: typeof out.confidence === "number" ? out.confidence : 0.5,
    });
  }
  return json({
    reply: typeof out.reply === "string" && out.reply.trim() ? out.reply.trim() : "うん、聞いてるよ。",
    intent: typeof out.intent === "string" ? out.intent : "unknown",
    confidence: typeof out.confidence === "number" ? out.confidence : 0.5,
    entities: (out.entities && typeof out.entities === "object") ? out.entities : {},
  });
});
