# Hoku × OpenAI API 導入ガイド（手順と金額）

> Hoku を OpenAI で賢くする方法。**既存の `callHokuApi` / `hokuApiUrl` 統合点**を使うため、
> アプリ本体（HTML）の改造はほぼ不要。**鍵はサーバ側に隠す**のが絶対条件。

---

## 0. 最重要：APIキーをHTMLに書いてはいけない

OpenAI のキーをアプリ（HTML/JS）に直接書くと、**誰でもソースを見て盗める → 高額請求の被害**になります。
必ず **バックエンド（Supabase Edge Function）にキーを置き、アプリはそのバックエンド経由で呼ぶ**構成にします。

```
[アプリ(HTML)] --text--> [Supabase Edge Function(鍵を保持)] --> [OpenAI] --> 分類結果 --> アプリ
```

> Familink は既に Supabase を使っているため、追加のサーバ契約は不要。Edge Function を1つ足すだけ。

---

## 1. 設計（おすすめ：意図分類ハイブリッド）

現在の Hoku は既にこの形に対応済み：
- `callHokuApi(text)` が `{hokuApiUrl}/api/hoku/intent` に `{text}` をPOST
- バックエンドが `{ "intent": "...", "confidence": 0〜1 }` を返す
- **カテゴリ分類だけ OpenAI に任せ、データ抽出・実行はローカル**（安全＝AIがデータを捏造しない／安価＝出力が短い）
- API 失敗・タイムアウト(3秒)時は**自動でローカル解析にフォールバック**（既に実装済み）

→ つまり「OpenAIで認識精度UP・実処理はローカル」。**月数円〜**で動く現実的な構成。
（将来、会話文も生成したい場合は §6 参照）

有効な intent（バックエンドが返す値）：
```
calendar_add, task_add, budget_add, prep_add, prep_routine_add, health_add,
board_post_add, notification_add, shopping_add, shopping_frequent_add,
shopping_purchased, recurring_budget_add, cashflow_view, calendar_view,
task_view, budget_view, health_view, prep_view, shopping_view,
external_calendar_help, calendar_import_help, settings_help, unknown
```

---

## 2. 手順

### Step 1. OpenAI APIキーを取得
1. https://platform.openai.com/ に登録（要クレジットカード）
2. **Billing → 残高をプリペイドでチャージ**（最低 $5 程度でOK）
3. **API keys → Create new secret key** → `sk-...` をコピー（**この鍵は絶対に公開しない**）

### Step 2. Supabase Edge Function を作成
開発機（Node + Supabase CLI）で：
```bash
npm install -g supabase
supabase login
supabase link --project-ref <あなたのproject-ref>   # 例: jrmzzizjlkrogrbtzyuz

mkdir -p supabase/functions/hoku
# 下記 §3 のコードを supabase/functions/hoku/index.ts に保存
```

### Step 3. OpenAIキーを「サーバの秘密」として登録
```bash
supabase secrets set OPENAI_API_KEY=sk-あなたの鍵
```
> これでキーはサーバ側だけに保存され、アプリやGitには一切出ません。

### Step 4. デプロイ
```bash
supabase functions deploy hoku --no-verify-jwt
```
> `--no-verify-jwt`：アプリが Supabase の認証ヘッダ無しで呼べるように。
> （簡易保護を足したい場合は §5）

### Step 5. アプリに連携先URLを設定
関数のURLは：
```
https://<project-ref>.supabase.co/functions/v1/hoku
```
これを `S.hokuApiUrl` に設定します。方法は2通り：
- **A. 設定UIを復活**（`openHokuApiModal` は実装済み。メニュー導線だけ再追加すればURL入力できる）
- **B. ハードコード**：`S` 既定の `hokuApiUrl: ''` を上記URLにする（全ユーザー共通で有効化）

設定後、Hoku に話しかけると裏で OpenAI が分類 → 認識精度が上がります。

---

## 3. Edge Function コード（`supabase/functions/hoku/index.ts`）

```typescript
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const INTENTS = [
  "calendar_add","task_add","budget_add","prep_add","prep_routine_add",
  "health_add","board_post_add","notification_add","shopping_add",
  "shopping_frequent_add","shopping_purchased","recurring_budget_add",
  "cashflow_view","calendar_view","task_view","budget_view","health_view",
  "prep_view","shopping_view","external_calendar_help","calendar_import_help",
  "settings_help","unknown",
];

const SYS = `あなたは家族向けアプリ Familink の音声アシスタント Hoku の「意図分類器」です。
ユーザーの短い日本語入力を、次のいずれか1つの intent に分類してください：
${INTENTS.join(", ")}
予定追加=calendar_add、やること=task_add、家計/支出=budget_add、持ち物=prep_add、
毎週の持ち物=prep_routine_add、体調/熱=health_add、家族ボード投稿=board_post_add、
買い物追加=shopping_add、買った=shopping_purchased、〜を見せて/教えて=*_view。
必ず次のJSONのみを返す（説明文は禁止）：{"intent":"<上記のいずれか>","confidence":<0〜1>}
該当なし/曖昧は {"intent":"unknown","confidence":0.0}`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (o: unknown) =>
    new Response(JSON.stringify(o), { headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") return json({ intent: "unknown", confidence: 0 });

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 30,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYS }, { role: "user", content: text }],
      }),
    });
    const data = await r.json();
    let out = { intent: "unknown", confidence: 0 };
    try { out = JSON.parse(data.choices[0].message.content); } catch (_) {}
    if (!INTENTS.includes(out.intent)) out = { intent: "unknown", confidence: 0 };
    return json(out);
  } catch (_) {
    return json({ intent: "unknown", confidence: 0 }); // 失敗時もアプリはローカルにフォールバック
  }
});
```

> アプリは `{hokuApiUrl}/api/hoku/intent` に POST しますが、Edge Function は
> サブパスに関係なく POST を処理するのでそのまま動きます。

---

## 4. 金額（とても安い）

### OpenAI（gpt-4o-mini を推奨）
- 料金（2025年時点・目安）：**入力 $0.15 / 100万トークン、出力 $0.60 / 100万トークン**
- Hoku 1回 ≒ 入力170 + 出力15 トークン ≒ **約 $0.00003（約0.005円）/回**

| 利用規模 | 月間リクエスト | OpenAI 月額（目安） |
|---|---|---|
| 1家族（1日30回） | 約900回 | **約 $0.03（数円）** |
| 100家族 | 約9万回 | 約 $2.7 |
| 1,000家族 | 約90万回 | 約 $27 |

### Supabase Edge Functions
- **無料枠：月50万回呼び出し**（Pro プランで200万回）。初期は**無料**で十分。

### まとめ
- **個人/家族で使う分には実質ほぼ無料（月数円）**。
- 事業規模(1000家族)でも OpenAI ~$27/月程度。収益が立つ頃には誤差。
- 初期費用：OpenAI のプリペイド最低 **$5** だけ。

---

## 5. （任意）簡易保護

`--no-verify-jwt` は誰でも関数を叩ける状態。OpenAI 枠の悪用を防ぐ簡易策：
- **共有シークレット**：関数で `req.headers.get("x-hoku-key")` を必須にし、アプリの `callHokuApi` に同ヘッダを付ける（要・アプリ側の小改修）。
- **レート制限**：IP/分あたりの回数制限を関数内に実装。
- まずは個人検証なら `--no-verify-jwt` のままでも、月額上限を OpenAI 側で **Usage limits** に設定しておけば暴走課金は防げる（推奨：月 $5〜10 上限）。

---

## 6. 会話するHoku（✅ アプリ側 実装済み）

「自然な会話文」で返す**会話モード**をアプリに実装済み。設定 →「Hoku を AI で賢くする」
→ **会話モード** を ON にすると有効（要・下記の `chat` エンドポイントをデプロイ）。

### アプリの動作（実装済み）
- 設定で `会話モード` ON のとき、Hoku 送信時に `{hokuApiUrl}/api/hoku/chat` へ
  `{ text, context, history }` を POST し、`{ reply, intent? }` を受け取り**自然文を表示**。
- `context` ＝ `_hokuChatContext()` が作る家族の概要：**予定・タスク・買い物・今日の体調メモ・メンバー名**。
  - **家計の金額は送りません**（プライバシー配慮）。`history` は直近6発話のみ。
- 返答に登録系 `intent`（`*_add`）が含まれる場合のみ、**既存の確認フロー**に橋渡し（AIにDB操作はさせない＝安全。必ず確認画面）。
- **高精度化（重要）**：AI が `entities`（整形済みの title/date/time/member/amount 等）を返した場合、アプリは**それを直接使って**確認画面を開く（`_hokuIntentFromAI`）。ローカル正規表現の取りこぼし（例「せいやとの飲み」がうまく取れない等）を回避。member は名前→ID に解決。`entities` が無い応答はローカル抽出にフォールバック。
- API 失敗/タイムアウト(12秒)時は**自動でローカル判定にフォールバック**。
- **オプトイン**：会話モードは既定 OFF。ON 時に「概要が送信される／家計金額は送らない」と明示。

### chat 用 Edge Function（`supabase/functions/hoku/index.ts` に追記）
既存の `hoku` 関数に、パスで分岐して `chat` を足すのが簡単：

```typescript
// ... 既存の意図分類(§3)はそのまま。リクエストパスで分岐 ...
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const json = (o: unknown) =>
    new Response(JSON.stringify(o), { headers: { ...cors, "Content-Type": "application/json" } });

  // 会話モード
  if (url.pathname.endsWith("/chat")) {
    try {
      const { text, context, history } = await req.json();
      const today = (context && context.today) || new Date().toISOString().slice(0, 10);
      const members = (context && context.members) || [];
      const sys = `あなたは家族向けアプリ Familink のやさしいガイド役 Hoku です。
3児パパ・ママを支える温かく簡潔な相棒。返答(reply)は2〜3文・親しみやすく。
context（家族の予定/タスク/買い物/今日の体調/メンバー名）を踏まえて答える。

【最重要：登録の精度】予定・タスク・家計・体調・買い物などの「追加」依頼は、
intent を分類し、entities に**きれいに整形した値**を入れる：
- title: コマンド語（「カレンダーに」「タスクに」「追加して」等）や助詞を除いた**中身だけ**。
  例「カレンダーにせいやとの飲み追加して」→ title="せいやとの飲み"（崩さない・余計な語を足さない）。
- date: **${today}（${context?.weekday ?? "?"}曜）を今日として絶対日付 YYYY-MM-DD に解決**（明日/明後日/今週末/今度の月曜 等も具体日に。context.weekday/now を使う）。
- time: 24時間 HH:MM（「夜7時」「19時」→"19:00"）。
- member: 次のメンバー名のいずれかに一致すれば氏名を入れる、なければ null：${JSON.stringify(members)}
- amount: 金額(数値) / category: **context.budgetCategories のいずれか** / txType: "expense"|"income"（家計時）。
- temperature: 体温 / medicine: 薬 / symptoms: 症状配列（体調時）。
分類先(intent)：${INTENTS.join(", ")}
カレンダー=calendar_add、やること=task_add、家計=budget_add、体調=health_add、
買い物=shopping_add、毎週の持ち物=prep_routine_add、〜を見せて=*_view。
質問・雑談は intent="unknown"（entities 不要）。

必ず次のJSONのみ（説明文禁止）：
{"reply":"<自然文>","intent":"<上記のいずれか>","confidence":<0-1>,
 "entities":{"title":"","date":"","time":"","member":null,"amount":null,
   "category":null,"txType":null,"temperature":null,"medicine":null,"symptoms":[]}}`;
      const messages = [
        { role: "system", content: sys },
        { role: "system", content: "context: " + JSON.stringify(context ?? {}) },
        ...((history ?? []) as Array<{role:string;content:string}>).map(m => ({
          role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 500),
        })),
        { role: "user", content: String(text ?? "") },
      ];
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.2, max_tokens: 300,
          response_format: { type: "json_object" }, messages }),
      });
      const data = await r.json();
      let out: any = { reply: "ごめん、うまく聞き取れなかった。もう一度お願い。", intent: "unknown", confidence: 0 };
      try { out = JSON.parse(data.choices[0].message.content); } catch (_) {}
      if (!INTENTS.includes(out.intent)) out.intent = "unknown";
      return json(out);   // {reply, intent, confidence, entities}
    } catch (_) {
      return json({ reply: "（接続できませんでした）", intent: "unknown", confidence: 0 });
    }
  }

  // ...（既存：意図分類 /intent はそのまま）...
});
```
> ※ アプリは `{hokuApiUrl}/api/hoku/chat` に POST します（関数はパス末尾 `/chat` で会話分岐）。
> 共有シークレットを使う場合は、関数側で `req.headers.get("x-hoku-key")` を検証してください。

### 会話モードのコスト
- 1回 ≒ 入力 300〜600 + 出力 60〜150 トークン ≒ **約 $0.0002〜0.0005／回**（gpt-4o-mini）。
- 1家族（1日30回）＝**月 約10〜20円**。意図分類のみより少し高いが依然として激安。
- もっと賢くしたいときだけ `model` を `gpt-4o` 等に上げる（コストは約15〜40倍だがそれでも家族利用なら月数百円規模）。

---

## 7. アプリ側の対応状況

- ✅ **A. URL設定UI**：設定 →「Hoku を AI で賢くする」で URL を入力可能（再リンク済み）。
- ✅ **C. 共有シークレット**：`callHokuApi` / `callHokuChat` が `x-hoku-key` を送信（設定欄あり）。
- ✅ **会話モード**：トグル＋プライバシー同意＋確認フロー連携を実装。
- ✅ **接続テスト**：設定画面の「接続テスト」で疎通確認。
- B. ハードコード有効化（全員一律ON）は未対応（必要なら `hokuApiUrl` 既定値に設定）。

> **残りはバックエンドのデプロイのみ**（Supabase CLI が使える Mac/PC で §2・§6 のコードを deploy）。
> デプロイ後、アプリの設定で URL を入れ「接続テスト」→「保存」、会話モードを ON にすれば完了。
