# calendar-scan — 予定表スキャン（OpenAI Vision OCR）Edge Function

園・学校・習い事の予定表/お便り/給食表の **写真から予定候補(JSON)** を抽出する、Familink 専用の
Supabase Edge Function です。**Hoku 関数とは完全に独立**しており、Hoku の挙動には一切触れません。

## 重要・セキュリティ
- OpenAI の鍵は **サーバ側の環境変数 `OPENAI_API_KEY` のみ**（既存 Hoku 用に登録済みの Secret を共通利用）。
- **フロント(HTML)には鍵を絶対に置かない**。アプリは `supabase.functions.invoke('calendar-scan', …)` で
  ログイン中ユーザーの JWT と anon キーを自動付与して呼ぶだけ。
- 既定で JWT 検証 ON（`--no-verify-jwt` を付けない）＝ログイン中の Familink ユーザーだけが到達可能。

## 入出力
リクエスト(JSON):
```json
{ "image": "data:image/jpeg;base64,...", "year": 2026, "month": 6,
  "existing": [ { "date": "2026-06-21", "title": "保護者会" } ] }
```
レスポンス(JSON):
```json
{
  "events": [
    { "title":"遠足","date":"2026-06-15","allDay":true,"startTime":"","endTime":"",
      "location":"","notes":"持ち物：水筒・帽子・お弁当","confidence":0.92,
      "warnings":[],"originalText":"6/15 遠足 …" }
  ],
  "warnings": [],
  "rawText": "写真から読み取れた全テキスト",
  "confidence": 0.86
}
```
このレスポンスは、アプリ側の `analyzeCalendarImageWithAI()` →
`normalizeOcrEvents()` がそのまま `eventCandidate[]` に変換して確認画面に表示します。
**自動登録はせず、必ずユーザー確認後に一括登録**します。

## デプロイ
```sh
# OPENAI_API_KEY は Hoku 用に登録済みの Secret をそのまま共通利用（再設定不要）
supabase functions deploy calendar-scan      # JWT 検証 ON（--no-verify-jwt は付けない）
```

### モデルと精度
- 既定は **`gpt-4o`**（密な月間予定表の読み取り精度が高い）。アクセスできない鍵の場合は
  自動で **`gpt-4o-mini`** にフォールバックするので、どの層の鍵でも動作する。
- フロント側は「全体＋上下2分割」を並列で解析してマージ＆重複除去するため、20件級の密な表でも取りこぼしにくい。

### 任意の環境変数
| 変数 | 既定 | 用途 |
|---|---|---|
| `CALENDAR_SCAN_MODEL` | `gpt-4o` | Vision モデルの上書き（例 `gpt-4o-mini` に固定したい場合） |
| `CALENDAR_SCAN_SHARED_KEY` | （未設定） | 設定時のみ `x-cal-key` 一致を追加要求（独自URL直叩き用） |

## 失敗時の戻り
`{ "error": "ai_failed", "reason": "..." }` を 502 等で返します（reason は鍵を含めない安全な分類：
`openai_timeout` / `invalid_api_key` / `insufficient_quota` / `rate_limited` / `openai_unavailable` / `bad_ai_json` など）。
アプリ側は失敗時、モック解析へフォールバックして UX を止めません。
