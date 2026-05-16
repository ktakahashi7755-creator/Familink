# Hoku AI アシスタント化 設計計画

Familink の「Hoku」を、ChatGPT の劣化版ではなく **家族運営に特化した AI 秘書**
へ段階的に進化させるための設計正本。既存の単一 HTML / LocalStorage 構成を壊さず、
Hoku だけを段階的に外部 AI API 化する。

---

## 1. 結論

- Hoku の本格 AI 化は **6 フェーズ**で段階実装。いきなり全機能を作らない。
- 最優先 MVP は「自然文 → 構造化 JSON → 確認 → LocalStorage 保存」のパイプライン。
- **Phase 1（ローカル intent 強化）は本計画と同時に完了済み**（7 シナリオ全 PASS）。
- 外部 API は Phase 2 以降。API 失敗時は必ずローカル処理にフォールバック。
- AI が勝手に保存しない（確認モーダル必須）は全フェーズで不変の原則。

---

## 2. 全体像

```
[現在 / Phase 1]
Familink フロント（単一HTML）
  └ parseHokuIntent（ローカル簡易分類・785テスト緑）

[Phase 2-3]
Familink フロント
  ├ ① ローカル簡易判定（高速・オフライン）
  ├ ② 曖昧な時だけ → Hoku API（FastAPI + LLM）
  └ ③ API 失敗 → ①へフォールバック
       ↓ いずれも
  ④ 確認モーダル → ⑤ LocalStorage 保存

[Phase 4-6]
  ＋ Supabase/PostgreSQL（家族同期）
  ＋ 音声認識 / OCR（プリント読み取り）
  ＋ Hoku の記憶・家族別提案・週次サマリー
```

---

## 3. awesome-python 参考の技術選定表

awesome-python（Python 優良ライブラリ集）を参照し、Hoku に**本当に必要なものだけ**選定。

### 採用（Phase 2 で実装）
| 技術 | 用途 | 採用理由 |
|---|---|---|
| FastAPI | API サーバ | 軽量・型安全・自動 OpenAPI。MVP に最適 |
| Pydantic | 構造化出力の検証 | LLM 出力を JSON スキーマで厳格検証。誤データを弾ける |
| OpenAI API（or 同等 LLM API）| 意図分類・抽出 | 自前 LLM 運用は MVP では過剰。API で十分 |
| pytest | テスト | Python 標準的・学習コスト低 |
| python-dotenv | 環境変数管理 | API キーをコードから分離（セキュリティ必須） |
| uvicorn | ASGI サーバ | FastAPI の標準実行環境 |
| httpx | 外部 API 呼び出し | 非同期対応・タイムアウト制御 |

### 将来候補（Phase 4-6 で検討）
| 技術 | 用途 | 今は採用しない理由 |
|---|---|---|
| Supabase / PostgreSQL | 家族データ同期 | Phase 4。今は LocalStorage で十分 |
| LlamaIndex | プリント RAG 読み取り | Phase 6。MVP に RAG は不要 |
| Whisper（whisper.cpp）| 音声認識 | Phase 6。現状は Web Speech API で代替 |
| Tesseract / OCR API | プリント OCR | Phase 6 |
| Celery / RQ | 非同期ジョブ | 週次サマリー等の重い処理が出てから |
| Redis | キャッシュ / レート制限 | スケール段階で |

### 不採用
| 技術 | 不採用理由 |
|---|---|
| LangChain 等の重量級エージェント FW | MVP には過剰。FastAPI + Pydantic + 直接 API 呼び出しで足りる。デバッグ困難・依存膨張 |
| 分散処理基盤（Kafka 等）| 個人 MVP に不要 |
| 自前 LLM ホスティング | 運用コスト・GPU が MVP に見合わない |
| 複雑なマルチエージェント協調 | 1 つの意図分類タスクに過剰 |

**方針**：MVP は「FastAPI + Pydantic + LLM API + pytest」の最小 4 点セット。

---

## 4. MVP 構成

```
ユーザー自然文入力
  ↓
Hoku が意図判定（calendar_add / task_add / budget_add /
                  health_add / prep_add / shopping_add /
                  notification_add / unknown）
  ↓
必要項目を抽出（日付 / 対象者 / 金額 / 体温 / 症状 / 品目 等）
  ↓
構造化 JSON で返す（Pydantic 検証）
  ↓
Familink が確認モーダルを表示
  ↓
ユーザー確認後に LocalStorage へ保存（★ 確認前は絶対に保存しない）
```

---

## 5. システム構成図（テキスト）

```
┌─────────────────────────────┐
│ Familink フロント（単一HTML / GitHub Pages）   │
│  ・parseHokuIntent（ローカル分類）             │
│  ・callHokuApi()（Phase 3 で追加）             │
│  ・確認モーダル → LocalStorage 保存            │
└──────────────┬──────────────┘
               │ HTTPS（曖昧な時のみ）
               ▼
┌─────────────────────────────┐
│ Hoku API（FastAPI / Phase 2）                  │
│  POST /api/hoku/intent → Pydantic 検証          │
│         ↓                                       │
│  LLM API（OpenAI 等）で意図分類・項目抽出       │
│         ↓                                       │
│  構造化 JSON を返却                              │
└─────────────────────────────┘
   （Phase 4 で Supabase/PostgreSQL を後段に追加）
```

---

## 6. Hoku intent 設計

| intent | 必須項目 | 任意項目 | 不足時の質問 | 保存先（S.*）|
|---|---|---|---|---|
| calendar_add | title, date | time, member, note | 「いつの予定？」 | events[] |
| task_add | title | assignee, dueDate | 「タスク名を教えて」 | tasks[] |
| budget_add | amount | category, member, date | 「金額を教えて」 | txs[] |
| health_add | member | temperature, symptoms, medicine | 「誰の体調？」 | health[] |
| prep_add | items, (date) | member, category | 「何を準備する？」 | prep[] |
| shopping_add | items | qty, category | 「何を買う？」 | shoppingItems[] |
| notification_add | message, (time) | date | 「いつ通知する？」 | notifs[] |
| unknown | — | — | 「どこに入れる？」 | （保存しない）|

各 intent は `requires_confirmation: true`。保存前に必ず確認モーダル。

---

## 7. JSON スキーマ案（Pydantic 前提）

```json
{
  "intent": "prep_add",
  "confidence": 0.92,
  "requires_confirmation": true,
  "summary": "星斗の明日の準備に 水筒・お弁当・レジャーシート を追加します",
  "data": {
    "memberName": "星斗",
    "date": "2026-05-17",
    "items": ["水筒", "お弁当", "レジャーシート"]
  },
  "missing_fields": [],
  "follow_up_question": null
}
```

Pydantic モデル骨子（Phase 2 実装時）：
```python
class HokuIntentResponse(BaseModel):
    intent: Literal["calendar_add","task_add","budget_add","health_add",
                    "prep_add","shopping_add","notification_add","unknown"]
    confidence: float = Field(ge=0, le=1)
    requires_confirmation: bool = True
    summary: str
    data: dict
    missing_fields: list[str] = []
    follow_up_question: str | None = None
```

`data` は intent 別に専用モデルへ。LLM 出力が壊れていれば Pydantic が弾き、
フロントはローカル処理にフォールバック。

---

## 8. API 設計（FastAPI / Phase 2）

### POST /api/hoku/intent — 自然文 → 構造化 intent
- request: `{ "text": "明日18時 星斗 スイミング", "context": {...} }`
- response: 上記 JSON スキーマ
- エラー: `{ "error": "...", "fallback": true }`（フロントはローカル処理へ）

### POST /api/hoku/chat — 雑談 / unknown 系の短い応答
- request: `{ "text": "今日疲れた" }`
- response: `{ "reply": "おつかれさま。何か残ってることある？" }`

### GET /api/hoku/health — 死活監視
- response: `{ "status": "ok" }`

### 将来候補
- POST /api/documents/analyze（プリント OCR）
- POST /api/voice/transcribe（音声 → テキスト）
- GET /api/hoku/weekly-summary（週次家族サマリー）

共通方針：
- 認証：MVP は API キー（フロントには置かず、将来は Supabase Auth トークン）
- ログ：個人情報（子の名前・体温・家計額）は**ログに残さない**。intent 種別と
  処理時間のみ記録
- タイムアウト：フロント側 3 秒。超過でローカルフォールバック

---

## 9. Familink フロント連携設計

既存の `parseHokuIntent` / `executeHokuAction` を**壊さず**、ハイブリッド構成に。

優先順位：
1. ローカル簡易判定（`parseHokuIntent`）— 高速・オフライン可
2. confidence が低い / 曖昧な時だけ → Hoku API へ送信
3. API 失敗（タイムアウト / エラー）→ ローカル結果にフォールバック
4. いずれの場合も保存前に確認モーダル

追加する関数案（Phase 3）：
```js
async function callHokuApi(text, context) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);  // 3秒タイムアウト
  try {
    const res = await fetch(HOKU_API + '/api/hoku/intent', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context })
    });
    if(!res.ok) throw new Error('api');
    return await res.json();
  } catch(e) {
    return null;  // → 呼び出し側でローカル結果を使う
  } finally { clearTimeout(timer); }
}
```

API 失敗時 UX：「今はオフラインで処理したよ」と静かに表示し、機能は止めない。
LocalStorage 保存前バリデーション：必須項目欠落・型不正は保存せず確認モーダルで補完。
既存データを壊さない：新キー追加時は PERSIST 登録、既存配列は touch しない。

---

## 10. 実装ロードマップ

| Phase | 目的 | 成果物 | 完了条件 | リスク |
|---|---|---|---|---|
| **1** | ローカル intent 強化 | parseHokuIntent 精度向上 | 7 シナリオ全 PASS | 低（完了済み） |
| 2 | Hoku API 作成 | FastAPI + Pydantic + /intent | API 単体で intent 返却 | 中（別リポジトリ） |
| 3 | フロント連携 | callHokuApi + フォールバック | API 失敗でもアプリ動作 | 中 |
| 4 | DB 化 | Supabase/PostgreSQL | 家族同期の土台 | 高（要オーナー確認） |
| 5 | 記憶 / 提案 | 家族別サマリー | 週次サマリー生成 | 中 |
| 6 | 音声 / OCR | 音声・プリント読取 | 写真から予定抽出 | 高 |

各 Phase は後戻り可能：API 層は独立、失敗時は常にローカルへフォールバック。

---

## 11. Claude Code 向けタスク分解（Phase 1 — 完了済み）

```
Task 1（完了）：
  目的：notification_add の明示依頼を最優先
  対象：app-source/familink.html parseHokuIntent
  作業：isExplicitNotification（通知して/リマインドして等）を追加し、
        v.category に関わらず notification_add を優先
  完了条件：7 シナリオ全 PASS
  テスト：VM で 7 シナリオ + 全 22 スイート
```

Phase 2 以降は別ブランチ / 別タスクで。Hoku API は Familink リポジトリとは
別構成（Python）になるため、着手前にオーナー確認。

---

## 12. セキュリティ / プライバシー設計

- API キーをフロントに置かない（GitHub Pages は全コード公開）→ サーバ側 .env で管理
- LLM へ渡す情報を最小化：子の本名は送らず「メンバー1」等の匿名 ID に置換する案
- 子の名前・体調・家計額は **API ログに残さない**（intent 種別のみログ）
- 保存前確認を全 intent で必須化
- データ削除 / エクスポートはユーザー操作で常に可能（既存「データ書き出し」活用）
- 将来の利用規約 / プライバシーポリシーに「AI 処理に外部 API を使う場合の説明」を追記

---

## 13. 課金設計

| | 無料プラン | プレミアム（¥480/月）|
|---|---|---|
| 予定 / タスク / 買い物 / 家計 / 体調 | ○ | ○ |
| Hoku 簡易入力（ローカル分類）| ○ | ○ |
| Hoku AI 自然文登録（API 経由・高精度）| — | ○ |
| 音声入力 | — | ○ |
| プリント読み取り | — | ○ |
| 自動リマインド候補 | — | ○ |
| 週次家族運営サマリー | — | ○ |
| 家族別の提案 | — | ○ |

- ¥480 の納得感：「入力の手間が消える」「家族の段取りを AI が先回り」
- 使いすぎ防止：プレミアムでも 1 日の AI 呼び出しに上限（例 100 回/日）
- AI コスト抑制：① まずローカル判定で API 呼び出しを減らす ② 安価なモデル
  （gpt-4o-mini 級）を既定 ③ 短いプロンプト ④ confidence 高い時は API を呼ばない

---

## 14. 今すぐ着手すべき最初のタスク

**Phase 1 は完了済み**（notification 明示依頼の優先化、7 シナリオ全 PASS）。
次の着手候補（オーナー確認後）：
- Phase 2：別リポジトリで FastAPI + Pydantic の Hoku API 雛形を作成
- それまでは Familink 側でローカル intent の精度を継続改善（安全・無料）

---

## 15. Claude Code 向け 初回実装プロンプト（Phase 2 着手用）

```
あなたは Hoku API（Python / FastAPI）の開発担当です。
Familink 本体（単一 HTML）とは別の新規リポジトリ / ディレクトリに、
以下だけを実装してください。勝手に機能を増やさないこと。

実装対象：
- FastAPI アプリ（uvicorn 起動）
- POST /api/hoku/intent：text を受け取り、HokuIntentResponse（Pydantic）を返す
- GET  /api/hoku/health：{status:"ok"}
- 意図分類は LLM API（OpenAI 等）を呼ぶ。API キーは .env から読む
- pytest でユニットテスト（7 シナリオ）

禁止：
- API キーをコードに直書きしない
- LangChain 等の重量級 FW を入れない（FastAPI + Pydantic + httpx のみ）
- Familink 本体（familink.html）は触らない

完了条件：
- /api/hoku/intent が 7 シナリオで正しい intent を返す
- pytest 全 PASS
- README に起動方法を記載
```

---

*本計画は MVP 前提。Phase 4 以降（DB / 音声 / OCR）は LocalStorage 構造や*
*外部サービスに関わるため、着手前に必ずオーナー確認を挟む（CLAUDE.md §7 準拠）。*
