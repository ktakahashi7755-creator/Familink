"""Hoku 意図分類のユニットテスト。

オーナー提供の 7 シナリオ + Pydantic 検証 + 異常系。
LLM API キー不要（ルールベース分類で全 PASS する想定）。
"""
from app.classifier import classify, classify_rule
from app.models import IntentResponse


# ── オーナー提供の 7 シナリオ ─────────────────────
SCENARIOS = [
    ("明日の15時に星斗の歯医者入れて", "calendar_add"),
    ("明日の朝、体操着持たせるの忘れないように", "prep_add"),
    ("今日スーパーで4280円使った", "budget_add"),
    ("星旺が37.8度で咳あり。薬飲んだ", "health_add"),
    ("牛乳と卵とおむつを買い物リストに入れて", "shopping_add"),
    ("明日の朝7時に水筒忘れないように通知して", "notification_add"),
    ("今日疲れた", "unknown"),
]


def test_seven_scenarios():
    for text, expected in SCENARIOS:
        res = classify(text)
        assert res.intent == expected, f"{text!r} → {res.intent} (expected {expected})"


def test_response_is_pydantic_model():
    res = classify("今日スーパーで3200円使った")
    assert isinstance(res, IntentResponse)
    assert 0.0 <= res.confidence <= 1.0


def test_always_requires_confirmation():
    for text, _ in SCENARIOS:
        assert classify(text).requires_confirmation is True


def test_budget_amount_extracted():
    res = classify("今日スーパーで4280円使った")
    assert res.intent == "budget_add"
    assert res.data.get("amount") == 4280


def test_budget_amount_fullwidth():
    res = classify("ドラッグストアで３２００円使った")
    assert res.intent == "budget_add"
    assert res.data.get("amount") == 3200


def test_health_temperature_extracted():
    res = classify("星旺が37.8度で咳あり")
    assert res.intent == "health_add"
    assert res.data.get("temperature") == 37.8


def test_shopping_items_split():
    res = classify("牛乳と卵とおむつを買い物リストに入れて")
    assert res.intent == "shopping_add"
    assert "牛乳" in res.data.get("items", [])
    assert "卵" in res.data.get("items", [])


def test_unknown_has_follow_up():
    res = classify("今日疲れた")
    assert res.intent == "unknown"
    assert res.follow_up_question


def test_empty_input_is_unknown():
    assert classify("").intent == "unknown"
    assert classify("   ").intent == "unknown"


def test_weird_input_does_not_crash():
    for w in ["", " ", "??", "a" * 1900, "<script>", "null", "😀"]:
        res = classify_rule(w)
        assert res.intent in {
            "calendar_add", "task_add", "budget_add", "health_add",
            "prep_add", "shopping_add", "notification_add", "unknown",
        }


# ── 項目抽出（日付 / 時刻 / 対象者）─────────────────
def test_calendar_extracts_date_and_time():
    res = classify("明日の15時に星斗の歯医者入れて")
    assert res.intent == "calendar_add"
    assert res.data.get("time") == "15:00"
    assert res.data.get("date")  # ISO 日付が入る
    assert res.data.get("memberName") == "星斗"


def test_notification_extracts_time():
    res = classify("明日の朝7時に水筒忘れないように通知して")
    assert res.intent == "notification_add"
    assert res.data.get("time") == "07:00"


def test_health_extracts_member():
    res = classify("星旺が37.8度で咳あり")
    assert res.intent == "health_add"
    assert res.data.get("memberName") == "星旺"
    assert res.data.get("temperature") == 37.8


def test_budget_extracts_date():
    res = classify("今日スーパーで4280円使った")
    assert res.intent == "budget_add"
    assert res.data.get("date")  # 今日 → ISO


def test_general_words_not_taken_as_member():
    # 「明日」「今日」等は対象者として誤抽出しない
    res = classify("明日スーパーで3000円使った")
    assert res.data.get("memberName") in (None,)


def test_calendar_pianorecital_sports():
    assert classify("来週の土曜に太郎のサッカーの試合").intent == "calendar_add"
    assert classify("明日14時にピアノのレッスン入れて").intent == "calendar_add"

