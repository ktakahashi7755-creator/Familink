// ============================================================
// Familink 予定表スキャン — OpenAI Vision バックエンド（Supabase Edge Function / Deno）
//
// 役割：アプリ(HTML)から来る {image, year, month, existing} を OpenAI Vision に渡し、
//       園・学校・習い事の予定表/お便り/給食表の写真から「予定候補(JSON)」を1件残らず抽出して返す。
//   - 鍵はサーバ側（環境変数 OPENAI_API_KEY＝既存 Hoku と共通の Secret を流用）。フロント／Gitには出さない。
//   - Hoku 関数とは完全に別エンドポイント（/functions/v1/calendar-scan）。Hoku には触れない。
//   - 返却（アプリの normalizeOcrEvents が解釈する形）:
//       { events: [eventCandidate...], warnings: string[], rawText: string, confidence: number }
//       eventCandidate = { title, date(YYYY-MM-DD), allDay, startTime(HH:MM|""), endTime,
//                          location, notes, confidence(0..1), warnings:string[], originalText }
//
// 認証：既定で JWT 検証ON（ログイン中ユーザーのみ到達）。任意 CALENDAR_SCAN_SHARED_KEY/MODEL。
// デプロイ：supabase functions deploy calendar-scan（--no-verify-jwt は付けない）
//   既定モデルは gpt-4o（密な予定表で高精度）。アクセスできない場合は自動で gpt-4o-mini にフォールバック。
//   CALENDAR_SCAN_MODEL で明示上書き可。
// ============================================================

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";          // ★ Hoku と共通の Secret
const SHARED_KEY = Deno.env.get("CALENDAR_SCAN_SHARED_KEY") || "";
const PRIMARY_MODEL = Deno.env.get("CALENDAR_SCAN_MODEL") || "gpt-4o";   // 高精度（密なOCR向き）
const FALLBACK_MODEL = "gpt-4o-mini";                                    // アクセス不可時の保険

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cal-key, x-supabase-api-version",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// 抽出ルール（網羅性・グリッド読み・曜日自己補正を最重視）。
const SYSTEM_PROMPT = `あなたは日本の幼稚園・保育園・小学校・習い事の「予定表／お便り／給食表／月間行事予定」の写真を、
正確に読み取り、カレンダー登録用の予定(JSON)に変換する専門アシスタントです。
最優先は「正確さ」。日付を1日もずらさない／実在しない予定を1件も出さない、を厳守する。

【絶対禁止（誤検出ゼロ）】
- 写真に「実際に印字されている予定」だけを出力する。推測・想像で予定を足さない。例文やサンプルの内容を出さない。
- 文字が潰れて読めない、日付や月がどのマス/段か確定できない予定は、出力しない（無理に拾わない）。
- 自信が持てない予定は出さない。曖昧なものを「とりあえず入れる」ことは絶対にしない。

【網羅性（ただし正確な範囲で）】
- 上記を守った上で、確実に読み取れる予定はすべて拾う。月間グリッドは左上→右、上の週→下の週へ1マスずつ走査。
- 1つのマス（同じ日）に複数予定があれば、それぞれ別々に抽出する。空白マスは無視。
- 欄外・余白・下部の注記（例「毎週木曜 英語」「20日 集金」）も、確実に読めるものは抽出する。

【日付を1日もずらさない】
- 日付は必ず YYYY-MM-DD。年が無ければ context.year、月が無ければ context.month（年間表の1〜3月は context.year+1）。
- グリッドでは「その予定が書かれているマスの中の“日付の数字”」を正として使う。マスの位置・並びで推測しない。
- どのマス（=何日）か確定できない予定は、date を推測で割り当てず、その予定自体を出力しない。
- 各予定で、求めた date の曜日を自分で計算し、予定表の曜日（列見出し「日月火水木金土」やセル内「(水)」等）と
  一致するか必ず確認する。ずれていれば日付の数字を読み直して補正する。確認できないときは warnings に「日付要確認」を入れる。

【時刻・内容】
- 時刻は HH:MM(24時間)。「9:30」「9時半」も24時間表記に。開始だけなら endTime は空。時刻が無い行事は allDay=true。
- 「午前保育」「短縮授業」「給食なし」「振替休日」「個人面談」「避難訓練」「参観日」「集金」等はそのまま自然なタイトルに。
- 持ち物（水筒・上履き・体操服・お弁当・レジャーシート 等）は notes に。場所があれば location に。
- 各予定に confidence(0〜1)。曖昧なら下げ、warnings に短い日本語の理由を入れる。
- originalText に根拠となった写真内の文字列を可能な範囲で入れる。

出力は必ず次のJSON「形式」のみ（コードブロックや説明文を付けない）。下記はあくまで“形式の見本”で、
この中の文字（タイトル・日付・持ち物など）は絶対に出力に含めない。写真から実際に読み取った内容だけを入れる:
{
  "events": [
    { "title":"<写真の予定名>","date":"YYYY-MM-DD","allDay":true,"startTime":"","endTime":"",
      "location":"","notes":"","confidence":0.0,"warnings":[],"originalText":"<根拠となった写真内の文字>" }
  ],
  "rawText": "写真から読み取れた主要テキスト（分かる範囲で）",
  "confidence": 0.0
}
確実に読み取れる予定が1件も無ければ events を空配列にし、rawText に読み取れた文字を入れる（無理に予定を作らない）。`;

type OpenAIResult =
  | { ok: true; data: Record<string, unknown>; model: string }
  | { ok: false; reason: string; status?: number };

async function visionOnce(model: string, imageUrl: string, userText: string): Promise<OpenAIResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55000); // 高精度モデルは遅め。無応答は打ち切り
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 4096,            // 20件超でも途中省略しないよう十分に確保
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
    console.error("OpenAI fetch failed", model, aborted ? "timeout" : (e as Error)?.message);
    return { ok: false, reason: aborted ? "openai_timeout" : "network_error" };
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("OpenAI error", model, res.status, errText);
    let reason = "ai_error";
    if (res.status === 401) reason = "invalid_api_key";
    else if (res.status === 404 || /model|does not exist|do not have access/i.test(errText)) reason = "model_unavailable";
    else if (res.status === 429) reason = /insufficient_quota/i.test(errText) ? "insufficient_quota" : "rate_limited";
    else if (res.status >= 500) reason = "openai_unavailable";
    return { ok: false, reason, status: res.status };
  }
  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return { ok: false, reason: "empty_response" };
  try {
    return { ok: true, data: JSON.parse(content), model };
  } catch (_) {
    return { ok: false, reason: "bad_ai_json" };
  }
}

// 既定 gpt-4o → アクセス不可(model_unavailable)なら gpt-4o-mini で自動再試行（キーのアクセス層に非依存）。
async function callOpenAIVision(imageUrl: string, userText: string): Promise<OpenAIResult> {
  let r = await visionOnce(PRIMARY_MODEL, imageUrl, userText);
  if (!r.ok && r.reason === "model_unavailable" && PRIMARY_MODEL !== FALLBACK_MODEL) {
    r = await visionOnce(FALLBACK_MODEL, imageUrl, userText);
  }
  return r;
}

// AI 生出力をアプリが期待する eventCandidate 形へ軽く整える（最終正規化はフロントの normalizeOcrEvents が担う）
function sanitizeEvents(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  const out: Record<string, unknown>[] = [];
  for (const e of raw.slice(0, 80)) {
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

  if (SHARED_KEY && (req.headers.get("x-cal-key") || "") !== SHARED_KEY) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!OPENAI_API_KEY) return json({ error: "server_misconfigured: OPENAI_API_KEY 未設定" }, 500);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { return json({ error: "bad_json" }, 400); }

  let image = String(body.image ?? "");
  if (!image) return json({ error: "no_image" }, 400);
  if (!image.startsWith("data:")) image = "data:image/jpeg;base64," + image;
  if (image.length > 10_000_000) return json({ error: "image_too_large" }, 413); // ~7.5MB 相当

  const now = new Date();
  const year = Number(body.year) || now.getFullYear();
  const month = Number(body.month) || (now.getMonth() + 1);
  const existing = Array.isArray(body.existing) ? body.existing.slice(0, 50) : [];
  const part = String(body.part ?? "");      // "top"/"bottom"/"partial"/"" — 分割パスのヒント（任意）
  const annual = !!body.annual;              // 年間予定表（学校年度 4月〜翌3月）モード

  const partLine = part
    ? `この画像は予定表の${part === "top" ? "上半分" : part === "bottom" ? "下半分" : "一部分"}の切り抜きです。` +
      `月・日付・曜日の見出しがこの切り抜き内に見えていて、何月何日か確実に判別できる予定だけを出力する。` +
      `見出しが切れていて月や日が確定できない予定は、推測せず出力しない。\n`
    : "";

  const userText = annual
    ? `この写真は「年間予定表」（学校年度 4月〜翌年3月）です。写っている予定を1件残らず抽出してください。\n` +
      `context.year=${year}（年度の開始年）\n` +
      `重要：各予定の「月」は、その予定が属する月の見出し／段／列から必ず読む。` +
      `4〜12月は ${year} 年、1〜3月は ${year + 1} 年として date(YYYY-MM-DD) を作る。月をまたいで取り違えない。\n` +
      partLine +
      `既存の予定（重複参考・抽出対象ではない）:\n` +
      JSON.stringify(existing).slice(0, 1000) +
      `\n\n指定のJSON形式だけで返してください。`
    : `この写真は家族の予定表です。次の文脈で、写っている予定を1件残らず抽出してください。\n` +
      `context.year=${year}\ncontext.month=${month}\n` +
      partLine +
      `既存の予定（重複参考・抽出対象ではない）:\n` +
      JSON.stringify(existing).slice(0, 1200) +
      `\n\n指定のJSON形式だけで返してください。`;

  const result = await callOpenAIVision(image, userText);
  if (!result.ok) return json({ error: "ai_failed", reason: result.reason }, 502);

  const out = result.data;
  const events = sanitizeEvents(out.events);
  return json({
    events,
    warnings: Array.isArray(out.warnings) ? out.warnings.map((w) => String(w).slice(0, 160)).slice(0, 10) : [],
    rawText: typeof out.rawText === "string" ? out.rawText.slice(0, 4000) : "",
    confidence: typeof out.confidence === "number" ? Math.max(0, Math.min(1, out.confidence)) : (events.length ? 0.8 : 0.0),
    model: result.model,
  });
});
