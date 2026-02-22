"""Tests for the notification service."""

from unittest.mock import AsyncMock, patch

import pytest

from app.services.notification_service import (
    notify,
    notify_daily_reminder,
    notify_duplicate_submission,
    notify_payment_confirmed,
    notify_payment_queried,
    notify_payment_submitted,
    notify_payout_approved,
    notify_payout_declined,
    notify_payout_requested,
    send_push_notification,
)


# --- send_push_notification ---


@pytest.mark.asyncio
async def test_push_returns_false_when_no_token():
    result = await send_push_notification(None, "Test", "Body")
    assert result is False


@pytest.mark.asyncio
async def test_push_dev_mode_returns_true():
    """In dev mode (no VAPID key), push logs and returns True."""
    result = await send_push_notification("some-token", "Test", "Body")
    assert result is True


# --- notify (push + SMS fallback) ---


@pytest.mark.asyncio
async def test_notify_uses_push_when_token_present():
    """With push token and dev mode, should use push channel."""
    channel = await notify("some-token", "0244000001", "Test", "Hello")
    assert channel == "push"


@pytest.mark.asyncio
async def test_notify_falls_back_to_sms():
    """Without push token, should fall back to SMS."""
    channel = await notify(None, "0244000001", "Test", "Hello")
    assert channel == "sms"


@pytest.mark.asyncio
async def test_notify_returns_none_when_both_fail():
    """When both push and SMS fail, returns 'none'."""
    with patch(
        "app.services.notification_service.send_push_notification",
        new_callable=AsyncMock,
        return_value=False,
    ), patch(
        "app.services.notification_service.send_sms",
        new_callable=AsyncMock,
        return_value=False,
    ):
        channel = await notify("token", "0244000001", "Test", "Hello")
        assert channel == "none"


# --- Convenience notification functions ---


@pytest.mark.asyncio
async def test_notify_payment_submitted():
    channel = await notify_payment_submitted("token", "0244000001", "Kwame", 20.0)
    assert channel == "push"


@pytest.mark.asyncio
async def test_notify_payment_confirmed():
    channel = await notify_payment_confirmed("token", "0244000001", 20.0, 100.0)
    assert channel == "push"


@pytest.mark.asyncio
async def test_notify_payment_queried():
    channel = await notify_payment_queried("token", "0244000001", "Check amount")
    assert channel == "push"


@pytest.mark.asyncio
async def test_notify_duplicate_submission():
    channel = await notify_duplicate_submission("token", "0244000001")
    assert channel == "push"


@pytest.mark.asyncio
async def test_notify_payout_requested():
    channel = await notify_payout_requested("token", "0244000001", "Ama", 500.0)
    assert channel == "push"


@pytest.mark.asyncio
async def test_notify_payout_approved():
    channel = await notify_payout_approved("token", "0244000001", 500.0)
    assert channel == "push"


@pytest.mark.asyncio
async def test_notify_payout_declined():
    channel = await notify_payout_declined("token", "0244000001", "Insufficient funds")
    assert channel == "push"


@pytest.mark.asyncio
async def test_notify_daily_reminder():
    channel = await notify_daily_reminder("token", "0244000001", "Kofi", 20.0)
    assert channel == "push"


@pytest.mark.asyncio
async def test_notify_sms_fallback_content():
    """SMS fallback sends title + body concatenated."""
    with patch(
        "app.services.notification_service.send_sms",
        new_callable=AsyncMock,
        return_value=True,
    ) as mock_sms:
        channel = await notify(None, "0244000001", "Payment Confirmed", "GHS 20.00")
        assert channel == "sms"
        mock_sms.assert_called_once_with("0244000001", "Payment Confirmed: GHS 20.00")
