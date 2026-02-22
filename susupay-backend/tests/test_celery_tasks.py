"""Tests for Celery tasks (mocked — no broker required)."""

from unittest.mock import AsyncMock, patch


def test_send_notification_task():
    """send_notification_task dispatches to notify()."""
    with patch(
        "app.services.notification_service.notify",
        new_callable=AsyncMock,
        return_value="push",
    ) as mock_notify:
        from app.workers.tasks import send_notification_task

        result = send_notification_task("token", "0244000001", "Title", "Body", None)
        assert result == "push"
        mock_notify.assert_called_once_with("token", "0244000001", "Title", "Body", None)


def test_notify_payment_submitted_task():
    with patch(
        "app.services.notification_service.notify_payment_submitted",
        new_callable=AsyncMock,
        return_value="push",
    ) as mock_fn:
        from app.workers.tasks import notify_payment_submitted_task

        result = notify_payment_submitted_task("token", "0244000001", "Kwame", 20.0)
        assert result == "push"
        mock_fn.assert_called_once_with("token", "0244000001", "Kwame", 20.0)


def test_notify_payment_confirmed_task():
    with patch(
        "app.services.notification_service.notify_payment_confirmed",
        new_callable=AsyncMock,
        return_value="sms",
    ) as mock_fn:
        from app.workers.tasks import notify_payment_confirmed_task

        result = notify_payment_confirmed_task(None, "0244000001", 50.0, 200.0)
        assert result == "sms"
        mock_fn.assert_called_once_with(None, "0244000001", 50.0, 200.0)


def test_notify_payment_queried_task():
    with patch(
        "app.services.notification_service.notify_payment_queried",
        new_callable=AsyncMock,
        return_value="push",
    ) as mock_fn:
        from app.workers.tasks import notify_payment_queried_task

        result = notify_payment_queried_task("token", "0244000001", "Check this")
        assert result == "push"
        mock_fn.assert_called_once_with("token", "0244000001", "Check this")


def test_notify_duplicate_task():
    with patch(
        "app.services.notification_service.notify_duplicate_submission",
        new_callable=AsyncMock,
        return_value="sms",
    ) as mock_fn:
        from app.workers.tasks import notify_duplicate_task

        result = notify_duplicate_task(None, "0244000001")
        assert result == "sms"
        mock_fn.assert_called_once_with(None, "0244000001")
