from datetime import datetime

from app.services.sms_parser import parse_mtn_sms


def test_parse_standard_sms():
    sms = (
        "You have sent GHS 20.00 to Ama Owusu (0244123456).\n"
        "Transaction ID: 8675309ABC\n"
        "Date: 22/02/2025 10:34 AM\n"
        "Your new balance is GHS 130.00"
    )
    result = parse_mtn_sms(sms)
    assert result.confidence == "HIGH"
    assert result.amount == 20.00
    assert result.recipient_name == "Ama Owusu"
    assert result.recipient_phone == "0244123456"
    assert result.transaction_id == "8675309ABC"
    assert result.transaction_date == datetime(2025, 2, 22, 10, 34)


def test_parse_large_amount():
    sms = (
        "You have sent GHS 1,500.00 to Kwame Asante (0201234567).\n"
        "Transaction ID: TXN9988AABB\n"
        "Date: 15/01/2025 03:45 PM\n"
        "Your new balance is GHS 2,300.50"
    )
    result = parse_mtn_sms(sms)
    assert result.confidence == "HIGH"
    assert result.amount == 1500.00
    assert result.recipient_name == "Kwame Asante"
    assert result.recipient_phone == "0201234567"
    assert result.transaction_id == "TXN9988AABB"


def test_parse_partial_missing_date():
    sms = (
        "You have sent GHS 50.00 to Kofi Mensah (0244987654).\n"
        "Transaction ID: XXYYZZ1234\n"
        "Your new balance is GHS 80.00"
    )
    result = parse_mtn_sms(sms)
    assert result.confidence == "PARTIAL"
    assert result.amount == 50.00
    assert result.recipient_name == "Kofi Mensah"
    assert result.recipient_phone == "0244987654"
    assert result.transaction_id == "XXYYZZ1234"
    assert result.transaction_date is None


def test_parse_garbage_text():
    sms = "Your MTN data bundle of 1GB has been activated. Enjoy browsing!"
    result = parse_mtn_sms(sms)
    assert result.confidence == "FAILED"
    assert result.amount is None
    assert result.transaction_id is None


def test_parse_amount_no_decimals():
    sms = (
        "You have sent GHS 100 to Test Person (0244111222).\n"
        "Transaction ID: NODEC123\n"
        "Date: 01/03/2025 08:00 AM\n"
    )
    result = parse_mtn_sms(sms)
    assert result.amount == 100.0
    assert result.transaction_id == "NODEC123"
