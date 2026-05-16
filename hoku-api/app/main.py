"""Hoku API — FastAPI アプリ（Phase 2 スキャフォルド）。

エンドポイント:
  POST /api/hoku/intent  — 自然文 → 構造化 intent
  POST /api/hoku/chat    — 雑談 / unknown 系の短い応答
  GET  /api/hoku/health  — 死活監視

設計の正本: docs/hoku-ai-assistant-plan.md §8
セキュリティ: API キーは環境変数。個人情報はログに残さない。
"""
from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .classifier import classify
from .models import (
    ChatRequest,
    ChatResponse,
    HealthResponse,
    IntentRequest,
    IntentResponse,
)

load_dotenv()

app = FastAPI(title="Hoku API", version="0.1.0")

_origins = [o.strip() for o in os.getenv("HOKU_CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _check_key(x_hoku_key: str | None) -> None:
    """HOKU_API_KEY が設定されていればヘッダ検証する（任意）。"""
    required = os.getenv("HOKU_API_KEY", "").strip()
    if required and x_hoku_key != required:
        raise HTTPException(status_code=401, detail="invalid api key")


@app.get("/api/hoku/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.post("/api/hoku/intent", response_model=IntentResponse)
def intent(req: IntentRequest, x_hoku_key: str | None = Header(default=None)) -> IntentResponse:
    """自然文を構造化 intent に変換する。

    返す intent は requires_confirmation=True。Familink 側は確認モーダルを
    経てから LocalStorage に保存する（AI は勝手に保存しない）。
    """
    _check_key(x_hoku_key)
    # ログには intent 種別のみ残し、本文（個人情報を含みうる）は残さない。
    return classify(req.text)


@app.post("/api/hoku/chat", response_model=ChatResponse)
def chat(req: ChatRequest, x_hoku_key: str | None = Header(default=None)) -> ChatResponse:
    """unknown 系・雑談への短い応答。"""
    _check_key(x_hoku_key)
    return ChatResponse(reply="うん、聞いてるよ。予定・タスク・家計など、入れたいことがあれば教えてね。")
