import pytest
from httpx import AsyncClient

from app.services.auth_service import create_verification_token


STANDARD_SMS = (
    "You have sent GHS 20.00 to Test Collector ({momo}).\n"
    "Transaction ID: {txn_id}\n"
    "Date: 22/02/2026 10:34 AM\n"
    "Your new balance is GHS 130.00"
)


async def _create_collector_and_login(
    client: AsyncClient, phone: str, name: str = "Test Collector"
) -> tuple[str, str]:
    """Helper: register collector, set pin, set momo, login. Returns (access_token, invite_code)."""
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
    return login.json()["access_token"], invite_code


async def _create_client(
    client: AsyncClient, invite_code: str, phone: str, name: str = "Test Client"
) -> tuple[str, str]:
    """Helper: join client to collector group. Returns (client_access_token, client_id)."""
    resp = await client.post(
        "/api/v1/auth/client/join",
        json={
            "invite_code": invite_code,
            "full_name": name,
            "phone": phone,
            "daily_amount": 20.00,
        },
    )
    client_token = resp.json()["access_token"]
    profile = await client.get(
        "/api/v1/clients/me",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    return client_token, profile.json()["id"]


async def _fund_client(
    client: AsyncClient,
    collector_token: str,
    collector_phone: str,
    client_id: str,
    txn_id: str,
) -> None:
    """Submit SMS and confirm it so the client has a GHS 20 balance."""
    sms = STANDARD_SMS.format(momo=collector_phone, txn_id=txn_id)
    submit = await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "sms_text": sms},
        headers={"Authorization": f"Bearer {collector_token}"},
    )
    txn_uuid = submit.json()["transaction_id"]
    await client.post(
        f"/api/v1/transactions/{txn_uuid}/confirm",
        json={},
        headers={"Authorization": f"Bearer {collector_token}"},
    )


# --- Tests ---


@pytest.mark.asyncio
async def test_client_requests_emergency_payout(client: AsyncClient):
    """Client with sufficient balance can request an emergency payout."""
    coll_phone = "0244700001"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    cli_token, cli_id = await _create_client(client, invite, "0244800001")

    await _fund_client(client, coll_token, coll_phone, cli_id, "PAY001")

    resp = await client.post(
        "/api/v1/payouts/request",
        json={"amount": "15.00", "payout_type": "EMERGENCY", "reason": "Medical"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "REQUESTED"
    assert data["payout_type"] == "EMERGENCY"
    assert data["amount"] == "15.00"


@pytest.mark.asyncio
async def test_payout_exceeds_balance(client: AsyncClient):
    """Payout exceeding balance is rejected."""
    coll_phone = "0244700002"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    cli_token, cli_id = await _create_client(client, invite, "0244800002")

    await _fund_client(client, coll_token, coll_phone, cli_id, "PAY002")

    resp = await client.post(
        "/api/v1/payouts/request",
        json={"amount": "100.00", "payout_type": "EMERGENCY"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )
    assert resp.status_code == 400
    assert "exceeds" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_payout_with_zero_balance(client: AsyncClient):
    """Payout with zero balance is rejected."""
    coll_phone = "0244700003"
    _, invite = await _create_collector_and_login(client, coll_phone)
    cli_token, _ = await _create_client(client, invite, "0244800003")

    resp = await client.post(
        "/api/v1/payouts/request",
        json={"amount": "5.00", "payout_type": "SCHEDULED"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )
    assert resp.status_code == 400
    assert "no available balance" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_collector_approves_payout(client: AsyncClient):
    """Collector approves a REQUESTED payout."""
    coll_phone = "0244700004"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    cli_token, cli_id = await _create_client(client, invite, "0244800004")

    await _fund_client(client, coll_token, coll_phone, cli_id, "PAY004")

    req = await client.post(
        "/api/v1/payouts/request",
        json={"amount": "10.00", "payout_type": "EMERGENCY"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )
    payout_id = req.json()["id"]

    resp = await client.post(
        f"/api/v1/payouts/{payout_id}/approve",
        headers={"Authorization": f"Bearer {coll_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "APPROVED"
    assert resp.json()["approved_at"] is not None


@pytest.mark.asyncio
async def test_collector_declines_payout(client: AsyncClient):
    """Collector declines a REQUESTED payout with reason."""
    coll_phone = "0244700005"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    cli_token, cli_id = await _create_client(client, invite, "0244800005")

    await _fund_client(client, coll_token, coll_phone, cli_id, "PAY005")

    req = await client.post(
        "/api/v1/payouts/request",
        json={"amount": "10.00", "payout_type": "EMERGENCY"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )
    payout_id = req.json()["id"]

    resp = await client.post(
        f"/api/v1/payouts/{payout_id}/decline",
        json={"reason": "Not enough group funds"},
        headers={"Authorization": f"Bearer {coll_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "DECLINED"
    assert resp.json()["reason"] == "Not enough group funds"


@pytest.mark.asyncio
async def test_full_payout_lifecycle(client: AsyncClient):
    """Full lifecycle: request → approve → complete."""
    coll_phone = "0244700006"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    cli_token, cli_id = await _create_client(client, invite, "0244800006")

    await _fund_client(client, coll_token, coll_phone, cli_id, "PAY006")

    # Request
    req = await client.post(
        "/api/v1/payouts/request",
        json={"amount": "10.00", "payout_type": "SCHEDULED"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )
    payout_id = req.json()["id"]

    # Approve
    await client.post(
        f"/api/v1/payouts/{payout_id}/approve",
        headers={"Authorization": f"Bearer {coll_token}"},
    )

    # Complete
    resp = await client.post(
        f"/api/v1/payouts/{payout_id}/complete",
        headers={"Authorization": f"Bearer {coll_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "COMPLETED"
    assert resp.json()["completed_at"] is not None


@pytest.mark.asyncio
async def test_cannot_complete_without_approving(client: AsyncClient):
    """Cannot complete a REQUESTED payout (must approve first)."""
    coll_phone = "0244700007"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    cli_token, cli_id = await _create_client(client, invite, "0244800007")

    await _fund_client(client, coll_token, coll_phone, cli_id, "PAY007")

    req = await client.post(
        "/api/v1/payouts/request",
        json={"amount": "10.00", "payout_type": "EMERGENCY"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )
    payout_id = req.json()["id"]

    resp = await client.post(
        f"/api/v1/payouts/{payout_id}/complete",
        headers={"Authorization": f"Bearer {coll_token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_completed_payout_reduces_balance(client: AsyncClient):
    """Completed payout reduces client balance via the DB view."""
    coll_phone = "0244700008"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    cli_token, cli_id = await _create_client(client, invite, "0244800008")

    await _fund_client(client, coll_token, coll_phone, cli_id, "PAY008")

    # Balance should be 20.00
    bal = await client.get(
        "/api/v1/clients/me/balance",
        headers={"Authorization": f"Bearer {cli_token}"},
    )
    assert float(bal.json()["balance"]) == 20.0

    # Request and complete a 10.00 payout
    req = await client.post(
        "/api/v1/payouts/request",
        json={"amount": "10.00", "payout_type": "EMERGENCY"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )
    payout_id = req.json()["id"]

    await client.post(
        f"/api/v1/payouts/{payout_id}/approve",
        headers={"Authorization": f"Bearer {coll_token}"},
    )
    await client.post(
        f"/api/v1/payouts/{payout_id}/complete",
        headers={"Authorization": f"Bearer {coll_token}"},
    )

    # Balance should now be 10.00
    bal = await client.get(
        "/api/v1/clients/me/balance",
        headers={"Authorization": f"Bearer {cli_token}"},
    )
    assert float(bal.json()["balance"]) == 10.0


@pytest.mark.asyncio
async def test_client_views_payout_history(client: AsyncClient):
    """Client can view their payout history."""
    coll_phone = "0244700009"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    cli_token, cli_id = await _create_client(client, invite, "0244800009")

    await _fund_client(client, coll_token, coll_phone, cli_id, "PAY009")

    await client.post(
        "/api/v1/payouts/request",
        json={"amount": "5.00", "payout_type": "EMERGENCY"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )

    resp = await client.get(
        "/api/v1/payouts/my-payouts",
        headers={"Authorization": f"Bearer {cli_token}"},
    )
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["amount"] == "5.00"
    assert items[0]["status"] == "REQUESTED"


@pytest.mark.asyncio
async def test_collector_views_all_payouts(client: AsyncClient):
    """Collector can view all payouts with client names."""
    coll_phone = "0244700010"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    cli_token, cli_id = await _create_client(client, invite, "0244800010", "Payout Client")

    await _fund_client(client, coll_token, coll_phone, cli_id, "PAY010")

    await client.post(
        "/api/v1/payouts/request",
        json={"amount": "5.00", "payout_type": "SCHEDULED"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )

    resp = await client.get(
        "/api/v1/payouts",
        headers={"Authorization": f"Bearer {coll_token}"},
    )
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["client_name"] == "Payout Client"


@pytest.mark.asyncio
async def test_collector_filters_payouts_by_status(client: AsyncClient):
    """Collector can filter payouts by status."""
    coll_phone = "0244700011"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    cli_token, cli_id = await _create_client(client, invite, "0244800011")

    await _fund_client(client, coll_token, coll_phone, cli_id, "PAY011")

    # Create two payouts; approve one
    req1 = await client.post(
        "/api/v1/payouts/request",
        json={"amount": "5.00", "payout_type": "EMERGENCY"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )
    payout_id = req1.json()["id"]

    await client.post(
        f"/api/v1/payouts/{payout_id}/approve",
        headers={"Authorization": f"Bearer {coll_token}"},
    )

    req2 = await client.post(
        "/api/v1/payouts/request",
        json={"amount": "3.00", "payout_type": "EMERGENCY"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )

    # Filter REQUESTED — should get 1
    resp = await client.get(
        "/api/v1/payouts?status=REQUESTED",
        headers={"Authorization": f"Bearer {coll_token}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["amount"] == "3.00"

    # Filter APPROVED — should get 1
    resp = await client.get(
        "/api/v1/payouts?status=APPROVED",
        headers={"Authorization": f"Bearer {coll_token}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["amount"] == "5.00"


@pytest.mark.asyncio
async def test_multi_tenant_payout_list_isolation(client: AsyncClient):
    """Collector B cannot see Collector A's payouts."""
    phone_a = "0244700020"
    token_a, invite_a = await _create_collector_and_login(client, phone_a, "Collector A")
    cli_token, cli_id = await _create_client(client, invite_a, "0244800020")

    await _fund_client(client, token_a, phone_a, cli_id, "PAY020")

    await client.post(
        "/api/v1/payouts/request",
        json={"amount": "5.00", "payout_type": "EMERGENCY"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )

    # Collector B
    phone_b = "0244700021"
    token_b, _ = await _create_collector_and_login(client, phone_b, "Collector B")

    resp = await client.get(
        "/api/v1/payouts",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_multi_tenant_payout_action_isolation(client: AsyncClient):
    """Collector B cannot approve Collector A's payout."""
    phone_a = "0244700022"
    token_a, invite_a = await _create_collector_and_login(client, phone_a, "Collector A")
    cli_token, cli_id = await _create_client(client, invite_a, "0244800022")

    await _fund_client(client, token_a, phone_a, cli_id, "PAY022")

    req = await client.post(
        "/api/v1/payouts/request",
        json={"amount": "5.00", "payout_type": "EMERGENCY"},
        headers={"Authorization": f"Bearer {cli_token}"},
    )
    payout_id = req.json()["id"]

    # Collector B tries to approve
    phone_b = "0244700023"
    token_b, _ = await _create_collector_and_login(client, phone_b, "Collector B")

    resp = await client.post(
        f"/api/v1/payouts/{payout_id}/approve",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 400
