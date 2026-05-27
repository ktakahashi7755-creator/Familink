"""Hoku API の Pydantic モデル。

LLM / ルールベース分類の出力を厳格検証する。設計の正本は
docs/hoku-ai-assistant-plan.md §6-7。
"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

# Familink 側 S.* の保存先に対応する 8 intent
Intent = Literal[
    "calendar_add",
    "task_add",
    "budget_add",
    "health_add",
    "prep_add",
    "shopping_add",
    "notification_add",
    "unknown",
]


class IntentRequest(BaseModel):
    """POST /api/hoku/intent のリクエスト。"""

    text: str = Field(min_length=1, max_length=2000)
    # 直近の会話文脈など（任意）。個人情報は最小限に。
    context: dict = Field(default_factory=dict)


class IntentResponse(BaseModel):
    """Hoku が返す構造化 intent。

    requires_confirmation は常に True。Familink 側は確認モーダルを
    出してから LocalStorage に保存する（AI は勝手に保存しない）。
    """

    intent: Intent
    confidence: float = Field(ge=0.0, le=1.0)
    requires_confirmation: bool = True
    summary: str = ""
    data: dict = Field(default_factory=dict)
    missing_fields: list[str] = Field(default_factory=list)
    follow_up_question: Optional[str] = None
    # 分類手段: "rule"（ルールベース）/ "llm"（LLM API）
    source: Literal["rule", "llm"] = "rule"


class ChatRequest(BaseModel):
    """POST /api/hoku/chat のリクエスト。"""

    text: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    """雑談・unknown 系への短い応答。"""

    reply: str


class HealthResponse(BaseModel):
    """GET /api/hoku/health のレスポンス。"""

    status: Literal["ok"] = "ok"
    version: str = "0.1.0"
