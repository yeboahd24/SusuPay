"""Tests for analytics endpoints and service functions."""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest
from httpx import AsyncClient

from app.services.analytics_service import classify_payment, get_current_period
from app.services.auth_service import create_verification_token


STANDARD_SMS = (
    "You have sent GHS 20.00 to Test Collector ({momo}).\n"
    "Transaction ID: {txn_id}\n"
    "Date: 22/02/2026 10:34 AM\n"
    "Your new balance is GHS 130.00"
)


async def _create_collector_and_login(
    client: AsyncClient,
    phone: str,
    name: str = "Test Collector",
    contribution_amount: float = 20.0,
    contribution_frequency: str = "DAILY",
) -> tuple[str, str]:
    """Register collector, set pin, set momo, login, configure contribution. Returns (access_token, invite_code)."""
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": name, "phone": phone},
    )
    token = create_verification_token(phone, "REGISTER")
    await client.post(
        "/api/v1/auth/collector/set-pin",
        json={"verification_token": token, "pin": "1234", "pin_confirm": "1234"},
    )
    resp = await client.post(
        "/api/v1/auth/collector/set-momo",
        json={"verification_token": token, "momo_number": phone},
    )
    invite_code = resp.json()["invite_code"]

    login = await client.post(
        "/api/v1/auth/collector/login",
        json={"phone": phone, "pin": "1234"},
    )
    access_token = login.json()["access_token"]

    # Set contribution settings
    await client.patch(
        "/api/v1/collectors/me",
        json={
            "contribution_amount": contribution_amount,
            "contribution_frequency": contribution_frequency,
        },
        headers={"Authorization": f"Bearer {access_token}"},
    )

    return access_token, invite_code


async def _create_client(
    client: AsyncClient, invite_code: str, phone: str, name: str = "Test Client"
) -> tuple[str, str]:
    """Join client to collector group. Returns (client_access_token, client_id)."""
    resp = await client.post(
        "/api/v1/auth/client/join",
        json={
            "invite_code": invite_code,
            "full_name": name,
            "phone": phone,
        },
    )
    client_token = resp.json()["access_token"]
    profile = await client.get(
        "/api/v1/clients/me",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    return client_token, profile.json()["id"]


async def _submit_and_confirm(
    client: AsyncClient,
    collector_token: str,
    collector_phone: str,
    client_id: str,
    txn_id: str,
) -> None:
    """Submit an SMS and confirm it."""
    sms = STANDARD_SMS.format(momo=collector_phone, txn_id=txn_id)
    resp = await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "raw_sms_text": sms},
        headers={"Authorization": f"Bearer {collector_token}"},
    )
    txn = resp.json()
    await client.post(
        f"/api/v1/transactions/{txn['id']}/confirm",
        headers={"Authorization": f"Bearer {collector_token}"},
    )


# --- Unit tests for helpers ---


def test_classify_payment_paid():
    assert classify_payment(Decimal("20"), Decimal("20")) == "PAID"


def test_classify_payment_partial():
    assert classify_payment(Decimal("10"), Decimal("20")) == "PARTIAL"


def test_classify_payment_unpaid():
    assert classify_payment(Decimal("0"), Decimal("20")) == "UNPAID"


def test_classify_payment_overpaid():
    assert classify_payment(Decimal("25"), Decimal("20")) == "OVERPAID"


def test_classify_payment_zero_expected():
    assert classify_payment(Decimal("0"), Decimal("0")) == "UNPAID"
    assert classify_payment(Decimal("10"), Decimal("0")) == "PAID"


def test_get_current_period_daily():
    start, end, label = get_current_period("DAILY")
    assert label == "Today"
    assert (end - start).total_seconds() == 86400


def test_get_current_period_weekly():
    # Use a known Monday
    ref = date(2026, 2, 23)  # Monday
    start, end, label = get_current_period("WEEKLY", ref)
    assert start.weekday() == 0  # Monday
    assert "This Week" in label


def test_get_current_period_monthly():
    ref = date(2026, 2, 15)
    start, end, label = get_current_period("MONTHLY", ref)
    assert start.day == 1
    assert end.month == 3
    assert label == "February 2026"


# --- Integration tests ---


@pytest.mark.asyncio
async def test_collector_analytics_empty(client: AsyncClient):
    """Collector analytics with no clients returns zero counts."""
    collector_phone = "0244700001"
    access_token, _ = await _create_collector_and_login(client, collector_phone)

    resp = await client.get(
        "/api/v1/collectors/me/analytics",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["paid_count"] == 0
    assert data["unpaid_count"] == 0
    assert data["partial_count"] == 0
    assert data["collection_rate"] == 0.0
    assert data["group_health_score"] >= 0
    assert data["defaulters"] == []
    assert data["partial_payers"] == []


@pytest.mark.asyncio
async def test_collector_analytics_with_payments(client: AsyncClient):
    """Collector analytics correctly counts paid/unpaid clients."""
    collector_phone = "0244700002"
    access_token, invite_code = await _create_collector_and_login(
        client, collector_phone, contribution_amount=20.0
    )

    # Create 2 clients
    _, client1_id = await _create_client(client, invite_code, "0244800001", "Alice")
    _, client2_id = await _create_client(client, invite_code, "0244800002", "Bob")

    # Only client 1 pays
    await _submit_and_confirm(client, access_token, collector_phone, client1_id, "TXN-ANA-001")

    resp = await client.get(
        "/api/v1/collectors/me/analytics",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["paid_count"] == 1
    assert data["unpaid_count"] == 1
    assert len(data["defaulters"]) == 1
    assert data["defaulters"][0]["full_name"] == "Bob"
    assert data["collection_rate"] == 50.0


@pytest.mark.asyncio
async def test_collector_analytics_partial_payment(client: AsyncClient):
    """Partial payment is correctly classified when paid < expected."""
    collector_phone = "0244700003"
    access_token, invite_code = await _create_collector_and_login(
        client, collector_phone, contribution_amount=50.0
    )

    _, client_id = await _create_client(client, invite_code, "0244800003", "Charlie")

    # Submit a 20 GHS payment when 50 is expected
    await _submit_and_confirm(client, access_token, collector_phone, client_id, "TXN-ANA-002")

    resp = await client.get(
        "/api/v1/collectors/me/analytics",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["partial_count"] == 1
    assert len(data["partial_payers"]) == 1
    assert float(data["partial_payers"][0]["remaining"]) == 30.0


@pytest.mark.asyncio
async def test_collector_analytics_trust_distribution(client: AsyncClient):
    """Trust distribution counts HIGH/MEDIUM/LOW submissions."""
    collector_phone = "0244700004"
    access_token, invite_code = await _create_collector_and_login(
        client, collector_phone, contribution_amount=20.0
    )
    _, client_id = await _create_client(client, invite_code, "0244800004", "Diana")

    # Submit a valid SMS (should be HIGH trust with matching momo)
    sms = STANDARD_SMS.format(momo=collector_phone, txn_id="TXN-ANA-003")
    await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "raw_sms_text": sms},
        headers={"Authorization": f"Bearer {access_token}"},
    )

    resp = await client.get(
        "/api/v1/collectors/me/analytics",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    # At least one HIGH trust entry
    assert data["trust_distribution"]["high"] >= 1


@pytest.mark.asyncio
async def test_collector_dashboard_period_fields(client: AsyncClient):
    """Dashboard includes new period progress fields."""
    collector_phone = "0244700005"
    access_token, _ = await _create_collector_and_login(
        client, collector_phone, contribution_amount=25.0
    )

    resp = await client.get(
        "/api/v1/collectors/me/dashboard",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "contribution_amount" in data
    assert "contribution_frequency" in data
    assert "period_label" in data
    assert "paid_count" in data
    assert "collection_rate" in data


@pytest.mark.asyncio
async def test_client_analytics_empty(client: AsyncClient):
    """Client analytics with no payments shows UNPAID status."""
    collector_phone = "0244700006"
    access_token, invite_code = await _create_collector_and_login(
        client, collector_phone, contribution_amount=20.0
    )
    client_token, _ = await _create_client(client, invite_code, "0244800006", "Eve")

    resp = await client.get(
        "/api/v1/clients/me/analytics",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["period_status"]["status"] == "UNPAID"
    assert float(data["period_status"]["remaining"]) == 20.0
    assert data["payment_streak"] == 0
    assert data["group_paid_count"] == 0


@pytest.mark.asyncio
async def test_client_analytics_after_payment(client: AsyncClient):
    """Client analytics shows PAID after full payment."""
    collector_phone = "0244700007"
    access_token, invite_code = await _create_collector_and_login(
        client, collector_phone, contribution_amount=20.0
    )
    client_token, client_id = await _create_client(client, invite_code, "0244800007", "Frank")

    await _submit_and_confirm(client, access_token, collector_phone, client_id, "TXN-ANA-004")

    resp = await client.get(
        "/api/v1/clients/me/analytics",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["period_status"]["status"] == "PAID"
    assert float(data["period_status"]["remaining"]) == 0.0
    assert data["group_paid_count"] == 1


@pytest.mark.asyncio
async def test_client_profile_shows_contribution(client: AsyncClient):
    """Client profile includes collector's contribution settings."""
    collector_phone = "0244700008"
    access_token, invite_code = await _create_collector_and_login(
        client, collector_phone, contribution_amount=30.0, contribution_frequency="WEEKLY"
    )
    client_token, _ = await _create_client(client, invite_code, "0244800008", "Grace")

    resp = await client.get(
        "/api/v1/clients/me",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["contribution_amount"]) == 30.0
    assert data["contribution_frequency"] == "WEEKLY"


@pytest.mark.asyncio
async def test_collector_update_contribution_settings(client: AsyncClient):
    """Collector can update contribution amount and frequency."""
    collector_phone = "0244700009"
    access_token, _ = await _create_collector_and_login(
        client, collector_phone, contribution_amount=20.0
    )

    resp = await client.patch(
        "/api/v1/collectors/me",
        json={
            "contribution_amount": 50.0,
            "contribution_frequency": "WEEKLY",
        },
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["contribution_amount"]) == 50.0
    assert data["contribution_frequency"] == "WEEKLY"


@pytest.mark.asyncio
async def test_client_list_period_status(client: AsyncClient):
    """Collector's client list includes period status for each client."""
    collector_phone = "0244700010"
    access_token, invite_code = await _create_collector_and_login(
        client, collector_phone, contribution_amount=20.0
    )
    _, client_id = await _create_client(client, invite_code, "0244800010", "Henry")

    # Before payment
    resp = await client.get(
        "/api/v1/collectors/me/clients",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["period_status"] == "UNPAID"

    # After payment
    await _submit_and_confirm(client, access_token, collector_phone, client_id, "TXN-ANA-005")
    resp = await client.get(
        "/api/v1/collectors/me/clients",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    items = resp.json()
    assert items[0]["period_status"] == "PAID"


@pytest.mark.asyncio
async def test_group_members_period_status(client: AsyncClient):
    """Group member list shows period status for each member."""
    collector_phone = "0244700011"
    access_token, invite_code = await _create_collector_and_login(
        client, collector_phone, contribution_amount=20.0
    )
    client_token, client_id = await _create_client(client, invite_code, "0244800011", "Ivy")

    resp = await client.get(
        "/api/v1/clients/me/group",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert resp.status_code == 200
    members = resp.json()
    assert len(members) == 1
    assert "period_paid" in members[0]
    assert "period_status" in members[0]
