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

## 6. （発展）会話するHokuにしたい場合

意図分類ではなく「自然な会話文」も生成したい場合：
- Edge Function で `intent` に加えて `reply`（自然文）も返す。
- アプリの `callHokuApi` 消費部（家族の予定/タスク文脈を `text` に同梱）を少し拡張。
- コストは出力トークンが増える分 1回 $0.0003〜0.0006 程度（それでも安い）。
- ただし**データ操作は引き続きローカル実行**を維持（AIにDB操作を任せない＝安全）。

---

## 7. アプリ側の改修まとめ（必要なら対応します）

- **A. URL設定UIの復活**：`openHokuApiModal`（実装済み・現在メニュー未リンク）を設定に再追加 → ユーザーがURLを入れられる。
- **B. ハードコード有効化**：`hokuApiUrl` の既定値に関数URLを設定 → 全員で有効。
- **C. 共有シークレット対応**：`callHokuApi` にヘッダ追加（§5の保護を使う場合）。

> いずれもアプリ本体の小改修で対応可能。ご希望があれば実装します
> （バックエンドのデプロイだけは Supabase CLI が使えるMac/PC環境で行ってください）。
