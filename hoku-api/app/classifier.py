"""Hoku 意図分類。

MVP はルールベース分類で動作する（LLM API キー不要）。
HOKU_LLM_API_KEY が設定されていれば LLM 分類に切り替える余地を残すが、
本スキャフォルドでは LLM 呼び出しは未実装スタブ（安全側）。

設計: docs/hoku-ai-assistant-plan.md §6
Familink フロント側 parseHokuIntent と整合する判定順を採用する。
"""
from __future__ import annotations

import os
import re

from .models import IntentResponse

# ── 全角数字 → 半角 ───────────────────────────────
_ZEN = str.maketrans("０１２３４５６７８９", "0123456789")


def _normalize(text: str) -> str:
    return (text or "").strip().translate(_ZEN)


def _extract_amount(text: str) -> int | None:
    m = re.search(r"(\d{1,4})\s*万円?", text)
    if m:
        return int(m.group(1)) * 10000
    m = re.search(r"([\d,]+)\s*円", text)
    if m:
        return int(m.group(1).replace(",", ""))
    return None


def _extract_temp(text: str) -> float | None:
    m = re.search(r"(3[5-9]|4[0-2])[.．](\d)", text)
    if m:
        return float(f"{m.group(1)}.{m.group(2)}")
    m = re.search(r"(3[5-9]|4[0-2])\s*度", text)
    if m:
        return float(m.group(1))
    return None


def _split_items(segment: str) -> list[str]:
    parts = re.split(r"[、,/]|と|や", segment)
    return [p.strip() for p in parts if p.strip()]


def classify_rule(text: str) -> IntentResponse:
    """ルールベース分類。判定順は Familink JS と整合させる。"""
    t = _normalize(text)
    if not t:
        return IntentResponse(intent="unknown", confidence=0.2,
                              summary="入力が空です。", source="rule")

    # 1) 明示的な通知依頼を最優先（Familink Wave 75 と同方針）
    if re.search(r"(通知して|通知し|リマインドして|アラーム.*(かけ|セット|入れ)|知らせて)", t):
        return IntentResponse(
            intent="notification_add", confidence=0.9,
            summary="通知（リマインド）を登録します。",
            data={"message": t}, source="rule")

    # 2) 家計（金額シグナルあり）
    amount = _extract_amount(t)
    if amount is not None and re.search(r"(使った|払った|円|出費|支出|買った|代|費)", t):
        return IntentResponse(
            intent="budget_add", confidence=0.82,
            summary=f"家計に ¥{amount:,} を記録します。",
            data={"amount": amount}, source="rule")

    # 3) 体調（体温 or 症状）
    temp = _extract_temp(t)
    if temp is not None or re.search(r"(咳|発熱|鼻水|嘔吐|下痢|具合|症状|薬.*飲)", t):
        data: dict = {}
        if temp is not None:
            data["temperature"] = temp
        return IntentResponse(
            intent="health_add", confidence=0.82,
            summary="体調メモに残します。不安なら医療機関に相談してください。",
            data=data, source="rule")

    # 4) 買い物（買い物リスト系）
    if re.search(r"(買い物リスト|買い物メモ|買うもの|買っといて|買ってきて)", t):
        seg = re.split(r"を?買い物", t)[0]
        items = _split_items(seg)
        return IntentResponse(
            intent="shopping_add", confidence=0.85,
            summary="買い物リストに追加します。",
            data={"items": items}, source="rule")

    # 5) 準備（持ち物・準備関連語）
    if re.search(r"(準備|持ち物|持たせ|持って|忘れ物|体操着|体操服|水筒|連絡帳|"
                 r"給食袋|上履き|プールバッグ|お弁当|教科書)", t):
        return IntentResponse(
            intent="prep_add", confidence=0.8,
            summary="準備リストに追加します。",
            data={"raw": t}, source="rule")

    # 6) カレンダー（日時 + 予定シグナル）
    has_date = bool(re.search(r"(今日|明日|明後日|来週|\d{1,2}月\d{1,2}日|"
                              r"[月火水木金土日]曜)", t))
    has_time = bool(re.search(r"\d{1,2}時|朝|昼|夕方|夜", t))
    if (has_date or has_time) and re.search(
            r"(入れて|予定|スケジュール|歯医者|病院|スイミング|レッスン|"
            r"発表会|参観|面談|遠足|塾|習い事)", t):
        return IntentResponse(
            intent="calendar_add", confidence=0.78,
            summary="予定に追加します。",
            data={"raw": t}, source="rule")

    # 7) タスク（動詞 + やること）
    if re.search(r"(やること|タスク|やっておく|提出|申し込|予約する|"
                 r"片付け|電話する|連絡する)", t):
        return IntentResponse(
            intent="task_add", confidence=0.7,
            summary="タスクに追加します。",
            data={"raw": t}, source="rule")

    # 8) 不明
    return IntentResponse(
        intent="unknown", confidence=0.3,
        summary="どこに入れるか判断できませんでした。",
        follow_up_question="どこに入れる？（予定 / タスク / 家計 / 体調 / 準備 / 買い物）",
        source="rule")


def classify(text: str) -> IntentResponse:
    """意図分類のエントリポイント。

    LLM プロバイダが設定されていれば LLM 分類を試みる想定だが、
    本スキャフォルドでは未実装のためルールベースにフォールバックする。
    """
    provider = os.getenv("HOKU_LLM_PROVIDER", "").strip()
    api_key = os.getenv("HOKU_LLM_API_KEY", "").strip()
    if provider and api_key:
        # Phase 2 後続タスクで LLM 呼び出しを実装する。
        # 実装するまではルールベースへフォールバック（安全側）。
        pass
    return classify_rule(text)
