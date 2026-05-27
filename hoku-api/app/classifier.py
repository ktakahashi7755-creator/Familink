"""Hoku 意図分類。

MVP はルールベース分類で動作する（LLM API キー不要）。
HOKU_LLM_API_KEY が設定されていれば LLM 分類に切り替える余地を残すが、
本スキャフォルドでは LLM 呼び出しは未実装スタブ（安全側）。

設計: docs/hoku-ai-assistant-plan.md §6
Familink フロント側 parseHokuIntent と整合する判定順を採用する。
"""
from __future__ import annotations

import datetime
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


def _extract_date(text: str, today: datetime.date | None = None) -> str | None:
    """相対日付語を ISO 文字列(YYYY-MM-DD)に変換する。"""
    today = today or datetime.date.today()
    if re.search(r"今日|本日", text):
        return today.isoformat()
    if re.search(r"明後日", text):
        return (today + datetime.timedelta(days=2)).isoformat()
    if re.search(r"明日", text):
        return (today + datetime.timedelta(days=1)).isoformat()
    if re.search(r"昨日", text):
        return (today - datetime.timedelta(days=1)).isoformat()
    m = re.search(r"(\d{1,2})月(\d{1,2})日", text)
    if m:
        y = today.year
        return f"{y}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
    return None


def _extract_time(text: str) -> str | None:
    """HH:MM 形式の時刻、または時間帯語を返す。

    「N時半」は 30 分、「午後 / 夜 / 夕方 + 12時未満」は 24 時間制へ補正する。
    """
    half = re.search(r"(\d{1,2})\s*時半", text)
    m = re.search(r"(\d{1,2})\s*時\s*(\d{0,2})\s*分?", text)
    if half or m:
        if half:
            h = min(23, int(half.group(1)))
            mi = 30
        else:
            h = min(23, int(m.group(1)))
            mi = min(59, int(m.group(2))) if m.group(2) else 0
        is_pm = bool(re.search(r"午後|ごご|PM|pm", text)) or (
            bool(re.search(r"夜|晩|夕方|夕", text)) and 1 <= h <= 11
        )
        is_am = bool(re.search(r"午前|AM|am|朝", text))
        if is_pm and 1 <= h < 12:
            h += 12
        if is_am and h == 12:
            h = 0
        return f"{h:02d}:{mi:02d}"
    if re.search(r"朝", text):
        return "08:00"
    if re.search(r"昼", text):
        return "12:00"
    if re.search(r"夕方", text):
        return "17:00"
    if re.search(r"夜|晩", text):
        return "19:00"
    return None


_MEMBER_STOPWORDS = {
    "今日", "明日", "明後日", "昨日", "今週", "来週", "予定", "今月", "先月",
    "うち", "家族", "自分", "時", "分", "朝", "昼", "夜", "晩", "夕方",
    "スーパー", "病院", "学校", "保育園", "幼稚園",
}


def _extract_member(text: str) -> str | None:
    """対象者名を推定する。「Xの」「Xが」「Xくん」等の前の名詞を拾う簡易版。

    名前は漢字・カタカナの連続とみなす（助詞・ひらがなは混ぜない）。
    先頭から候補を順に走査し、一般語でない最初の名詞を返す。
    """
    for m in re.finditer(r"([一-龠ァ-ヶ]{1,5})(?:くん|ちゃん|の|が|に)", text):
        # 直前が数字の断片（「15時」等）は除外
        if m.start() > 0 and text[m.start() - 1].isdigit():
            continue
        name = m.group(1)
        if name in _MEMBER_STOPWORDS:
            continue
        return name
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

    member = _extract_member(t)
    date = _extract_date(t)
    time = _extract_time(t)

    # 1) 明示的な通知依頼を最優先（Familink Wave 75 と同方針）
    if re.search(r"(通知して|通知し|リマインドして|アラーム.*(かけ|セット|入れ)|知らせて)", t):
        data: dict = {"message": t}
        if date:
            data["date"] = date
        if time:
            data["time"] = time
        return IntentResponse(
            intent="notification_add", confidence=0.9,
            summary="通知（リマインド）を登録します。",
            data=data, source="rule")

    # 2) 家計（金額シグナルあり）
    amount = _extract_amount(t)
    if amount is not None and re.search(r"(使った|払った|円|出費|支出|買った|代|費|入金|振込|引き落とし)", t):
        data = {"amount": amount}
        if date:
            data["date"] = date
        if member:
            data["memberName"] = member
        return IntentResponse(
            intent="budget_add", confidence=0.82,
            summary=f"家計に ¥{amount:,} を記録します。",
            data=data, source="rule")
    # 2b) 金額が読めなくても家計の言い回しが明確なら budget（金額は後で確認）
    if re.search(r"(買い物(した|してきた|に行った|に行って)|レシート|家計簿|家計に(つけ|入れ|記録))", t):
        data = {"raw": t}
        if amount is not None:
            data["amount"] = amount
        if date:
            data["date"] = date
        return IntentResponse(
            intent="budget_add", confidence=0.65,
            summary="家計に記録します。金額を確認してください。",
            data=data, source="rule")

    # 3) 体調（体温 or 症状）
    temp = _extract_temp(t)
    if temp is not None or re.search(
            r"(咳|発熱|鼻水|鼻づまり|くしゃみ|嘔吐|吐い|下痢|腹痛|お腹痛|おなか痛|"
            r"頭痛|具合|症状|微熱|高熱|薬.*飲|薬.*(もらった|貰った|処方|出された)|"
            r"インフル|発疹|湿疹)", t):
        data = {}
        if temp is not None:
            data["temperature"] = temp
        if member:
            data["memberName"] = member
        if date:
            data["date"] = date
        return IntentResponse(
            intent="health_add", confidence=0.82,
            summary="体調メモに残します。不安なら医療機関に相談してください。",
            data=data, source="rule")

    # 4) 買い物（買い物リスト系 / 補充系）
    if re.search(r"(買い物リスト|買い物メモ|買うもの|買っといて|買ってきて|買ってこ|"
                 r"買っとく|買って(?!る|た))", t):
        seg = re.split(r"を?買い物|を?買っ|を?買う", t)[0]
        items = _split_items(seg) or [seg.strip()]
        return IntentResponse(
            intent="shopping_add", confidence=0.85,
            summary="買い物リストに追加します。",
            data={"items": [i for i in items if i]}, source="rule")
    # 4b) 「○○がなくなった / 切らした / もうない」も買い物（補充）
    m = re.match(r"(.+?)(?:が|を|は|も)?(?:なくなっ|無くなっ|切らし|切れ(?:た|ちゃ)|"
                 r"もう(?:ない|無い)|残り少な|在庫(?:が)?ない)", t)
    if m and m.group(1).strip() and len(m.group(1).strip()) <= 20:
        return IntentResponse(
            intent="shopping_add", confidence=0.78,
            summary="買い物リストに追加します（補充）。",
            data={"items": _split_items(m.group(1)) or [m.group(1).strip()]},
            source="rule")

    # 5) 準備（持ち物・準備関連語）
    if re.search(r"(準備|持ち物|持たせ|持って|忘れ物|体操着|体操服|水筒|連絡帳|"
                 r"給食袋|上履き|プールバッグ|お弁当|教科書|時間割|名札|エプロン)", t):
        data = {"raw": t}
        if member:
            data["memberName"] = member
        if date:
            data["date"] = date
        return IntentResponse(
            intent="prep_add", confidence=0.8,
            summary="準備リストに追加します。",
            data=data, source="rule")

    # 6) カレンダー
    has_date = date is not None or bool(
        re.search(r"来週|来月|今週末|週末|今度|お盆|連休|[月火水木金土日]曜", t))
    has_time = time is not None
    _cal_signal = re.search(
        r"(入れて|予定|スケジュール|歯医者|病院|スイミング|レッスン|"
        r"発表会|参観|面談|遠足|塾|習い事|サッカー|ピアノ|お迎え|送迎|"
        r"迎え|集合|健診|検診|運動会|参加|行事|アポ|予約|"
        r"おでかけ|お出かけ|外出|帰省|旅行|ドライブ)", t)
    # 強い予定名詞は日時が無くても calendar とみなす
    _cal_strong = re.search(
        r"(歯医者|発表会|運動会|参観|面談|健診|検診|遠足|入学式|卒園式?|"
        r"卒業式?|お遊戯会|参観日|予約.*(取れた|した|入れた))", t)
    if ((has_date or has_time) and _cal_signal) or _cal_strong:
        data = {"raw": t}
        if date:
            data["date"] = date
        if time:
            data["time"] = time
        if member:
            data["memberName"] = member
        return IntentResponse(
            intent="calendar_add", confidence=0.78,
            summary="予定に追加します。",
            data=data, source="rule")

    # 7) タスク（動詞 + やること / 義務表現 / 家事 / お使い）
    if re.search(r"(やること|タスク|やっておく|提出|申し込|予約する|予約して|"
                 r"片付け|電話する|電話して|連絡する|問い合わせ|返却|記入|"
                 r"サインしな|手続き|(?:ゴミ|ごみ)(?:出し|出す|捨て)|資源(?:ゴミ|ごみ)|"
                 r"名前つけ|名前付け|記名|"
                 r"(?:役所|市役所|区役所|銀行|郵便局|図書館).{0,5}(?:行く|行か|寄)|"
                 r"取りに行|受け取りに|"
                 r"(?:宿題|書類|プリント|提出物|連絡帳).{0,5}(?:確認|チェック|出す|提出|記入)|"
                 r"(?:し|やら|させ|やらせ|出さ)(?:なきゃ|ないと|なくちゃ))", t):
        data = {"raw": t}
        if date:
            data["dueDate"] = date
        return IntentResponse(
            intent="task_add", confidence=0.7,
            summary="タスクに追加します。",
            data=data, source="rule")

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
