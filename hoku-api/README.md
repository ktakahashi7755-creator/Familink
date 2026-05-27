# Hoku API（Phase 2 スキャフォルド）

Familink の AI アシスタント「Hoku」を外部 API 化するための FastAPI バックエンド。
**Familink 本体（単一 HTML）とは独立**しており、GitHub Pages の配信には影響しない。

設計の正本: `../docs/hoku-ai-assistant-plan.md`

---

## 現状（Phase 2 スキャフォルド）

- FastAPI アプリと 3 エンドポイントを実装
- 意図分類は**ルールベース**（LLM API キー不要で動作）
- LLM 分類は `classifier.classify()` にフック点のみ用意（未実装スタブ）
- pytest で 7 シナリオ + 異常系を検証

## エンドポイント

| メソッド | パス | 用途 |
|---|---|---|
| POST | /api/hoku/intent | 自然文 → 構造化 intent（Pydantic 検証済み）|
| POST | /api/hoku/chat | 雑談 / unknown 系への短い応答 |
| GET  | /api/hoku/health | 死活監視 |

## セットアップ

```bash
cd hoku-api
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # 必要なら値を編集（LLM キーは任意）
```

## 起動

```bash
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/docs で Swagger UI
```

## テスト

```bash
pytest -q
```

7 シナリオ + Pydantic 検証 + 異常系がすべて PASS する（LLM API キー不要）。

## セキュリティ方針

- API キー（LLM / アクセス制御）はすべて環境変数。コードに直書きしない
- `.env` は `.gitignore` 済み。コミットされるのは `.env.example` のみ
- `/api/hoku/intent` のログには intent 種別のみ残し、本文（個人情報を
  含みうる）は残さない
- 詳細: `../docs/security-auth-notes.md`

## 次のステップ（Phase 2 後続 / 要オーナー確認）

- `classifier.classify()` に LLM API 呼び出しを実装（httpx + プロバイダ API）
- Familink フロントからの呼び出し（`callHokuApi()`）と接続（Phase 3）
- デプロイ先の決定（Render / Fly.io / Cloudflare 等）

> 本スキャフォルドは未デプロイ・未課金。LLM 連携・デプロイは
> オーナー確認後に進める（CLAUDE.md §7 準拠）。
