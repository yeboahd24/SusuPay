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


async def _fund_client(
    client: AsyncClient,
    collector_token: str,
    collector_phone: str,
    client_id: str,
    txn_id: str,
) -> None:
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
async def test_empty_monthly_summary(client: AsyncClient):
    """Monthly summary with no transactions returns zero totals."""
    coll_phone = "0244900001"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    await _create_client(client, invite, "0244900101", "Empty Client")

    resp = await client.get(
        "/api/v1/reports/monthly-summary?year=2026&month=2",
        headers={"Authorization": f"Bearer {coll_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_deposits"] == "0.00"
    assert data["total_payouts"] == "0.00"
    assert data["net_balance"] == "0.00"
    assert data["client_count"] == 1


@pytest.mark.asyncio
async def test_monthly_summary_with_transactions(client: AsyncClient):
    """Monthly summary reflects confirmed transactions."""
    coll_phone = "0244900002"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    _, cli_id = await _create_client(client, invite, "0244900102", "Active Client")

    await _fund_client(client, coll_token, coll_phone, cli_id, "RPT001")
    await _fund_client(client, coll_token, coll_phone, cli_id, "RPT002")

    resp = await client.get(
        "/api/v1/reports/monthly-summary?year=2026&month=2",
        headers={"Authorization": f"Bearer {coll_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["total_deposits"]) == 40.0
    assert data["clients"][0]["deposit_count"] == 2


@pytest.mark.asyncio
async def test_pdf_returns_valid_pdf(client: AsyncClient):
    """PDF endpoint returns bytes starting with %PDF-."""
    coll_phone = "0244900003"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    await _create_client(client, invite, "0244900103")

    resp = await client.get(
        "/api/v1/reports/monthly-summary/pdf?year=2026&month=2",
        headers={"Authorization": f"Bearer {coll_token}"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:5] == b"%PDF-"


@pytest.mark.asyncio
async def test_client_statement_with_deposits(client: AsyncClient):
    """Client statement shows deposit line items."""
    coll_phone = "0244900004"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    _, cli_id = await _create_client(client, invite, "0244900104", "Statement Client")

    await _fund_client(client, coll_token, coll_phone, cli_id, "RPT004")

    resp = await client.get(
        f"/api/v1/reports/client-statement/{cli_id}?year=2026&month=2",
        headers={"Authorization": f"Bearer {coll_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["client_name"] == "Statement Client"
    assert float(data["opening_balance"]) == 0.0
    assert float(data["closing_balance"]) == 20.0
    assert len(data["items"]) == 1
    assert data["items"][0]["type"] == "DEPOSIT"


@pytest.mark.asyncio
async def test_multi_tenant_client_statement(client: AsyncClient):
    """Collector B cannot view Collector A's client statement."""
    phone_a = "0244900005"
    token_a, invite_a = await _create_collector_and_login(client, phone_a, "Collector A")
    _, cli_id = await _create_client(client, invite_a, "0244900105")

    phone_b = "0244900006"
    token_b, _ = await _create_collector_and_login(client, phone_b, "Collector B")

    resp = await client.get(
        f"/api/v1/reports/client-statement/{cli_id}?year=2026&month=2",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_invalid_month_422(client: AsyncClient):
    """Invalid month returns 422."""
    coll_phone = "0244900007"
    coll_token, _ = await _create_collector_and_login(client, coll_phone)

    resp = await client.get(
        "/api/v1/reports/monthly-summary?year=2026&month=13",
        headers={"Authorization": f"Bearer {coll_token}"},
    )
    assert resp.status_code == 422
