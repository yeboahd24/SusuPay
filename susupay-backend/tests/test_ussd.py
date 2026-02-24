import pytest
from httpx import AsyncClient

from app.services.auth_service import create_verification_token


STANDARD_SMS = (
    "You have sent GHS 20.00 to Test Collector ({momo}).\n"
    "Transaction ID: {txn_id}\n"
    "Date: 22/02/2026 10:34 AM\n"
    "Your new balance is GHS 130.00"
)


def _ussd_request(
    session_id: str,
    phone: str,
    req_type: str = "Initiation",
    message: str = "",
    sequence: int = 1,
) -> dict:
    return {
        "SessionId": session_id,
        "ServiceCode": "*713*123#",
        "PhoneNumber": phone,
        "Type": req_type,
        "Message": message,
        "Operator": "MTN",
        "Sequence": sequence,
    }


async def _create_collector_and_login(
    client: AsyncClient, phone: str, name: str = "Test Collector"
) -> tuple[str, str]:
    """Register collector, set pin, set momo, login. Returns (access_token, invite_code)."""
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
async def test_initiation_registered_client(client: AsyncClient, flush_ussd_keys):
    """Initiation with registered client returns main menu."""
    coll_phone = "0244900001"
    _, invite = await _create_collector_and_login(client, coll_phone)
    await _create_client(client, invite, "0244900002")

    resp = await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-001", "233244900002"),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["Type"] == "Response"
    assert "Check Balance" in data["Message"]
    assert data["Label"] == "SusuPay"


@pytest.mark.asyncio
async def test_initiation_unregistered_phone(client: AsyncClient, flush_ussd_keys):
    """Initiation with unregistered phone returns Release."""
    resp = await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-002", "233244999999"),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["Type"] == "Release"
    assert "not registered" in data["Message"].lower()


@pytest.mark.asyncio
async def test_check_balance(client: AsyncClient, flush_ussd_keys):
    """Select option 1 returns balance."""
    coll_phone = "0244900003"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    _, cli_id = await _create_client(client, invite, "0244900004")
    await _fund_client(client, coll_token, coll_phone, cli_id, "USSD001")

    # Initiate
    await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-003", "233244900004"),
    )
    # Select balance
    resp = await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-003", "233244900004", "Response", "1", 2),
    )
    data = resp.json()
    assert data["Type"] == "Release"
    assert "20.00" in data["Message"]


@pytest.mark.asyncio
async def test_payment_history_with_transactions(client: AsyncClient, flush_ussd_keys):
    """Select option 2 returns payment history."""
    coll_phone = "0244900005"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    _, cli_id = await _create_client(client, invite, "0244900006")
    await _fund_client(client, coll_token, coll_phone, cli_id, "USSD002")

    await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-004", "233244900006"),
    )
    resp = await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-004", "233244900006", "Response", "2", 2),
    )
    data = resp.json()
    assert data["Type"] == "Release"
    assert "GHS 20.00" in data["Message"]
    assert "Recent payments" in data["Message"]


@pytest.mark.asyncio
async def test_payment_history_empty(client: AsyncClient, flush_ussd_keys):
    """Select option 2 with no transactions returns empty message."""
    coll_phone = "0244900007"
    _, invite = await _create_collector_and_login(client, coll_phone)
    await _create_client(client, invite, "0244900008")

    await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-005", "233244900008"),
    )
    resp = await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-005", "233244900008", "Response", "2", 2),
    )
    data = resp.json()
    assert data["Type"] == "Release"
    assert "No transactions" in data["Message"]


@pytest.mark.asyncio
async def test_request_payout_flow(client: AsyncClient, flush_ussd_keys):
    """Select option 3 then enter amount creates payout."""
    coll_phone = "0244900009"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    _, cli_id = await _create_client(client, invite, "0244900010")
    await _fund_client(client, coll_token, coll_phone, cli_id, "USSD003")

    # Initiate
    await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-006", "233244900010"),
    )
    # Select payout
    resp = await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-006", "233244900010", "Response", "3", 2),
    )
    assert resp.json()["Type"] == "Response"
    assert "amount" in resp.json()["Message"].lower()

    # Enter amount
    resp = await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-006", "233244900010", "Response", "15", 3),
    )
    data = resp.json()
    assert data["Type"] == "Release"
    assert "15.00" in data["Message"]
    assert "requested" in data["Message"].lower()


@pytest.mark.asyncio
async def test_request_payout_exceeds_balance(client: AsyncClient, flush_ussd_keys):
    """Payout amount exceeding balance returns error."""
    coll_phone = "0244900011"
    coll_token, invite = await _create_collector_and_login(client, coll_phone)
    _, cli_id = await _create_client(client, invite, "0244900012")
    await _fund_client(client, coll_token, coll_phone, cli_id, "USSD004")

    await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-007", "233244900012"),
    )
    await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-007", "233244900012", "Response", "3", 2),
    )
    resp = await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-007", "233244900012", "Response", "500", 3),
    )
    data = resp.json()
    assert data["Type"] == "Release"
    assert "insufficient" in data["Message"].lower() or "exceeds" in data["Message"].lower()


@pytest.mark.asyncio
async def test_request_payout_invalid_amount(client: AsyncClient, flush_ussd_keys):
    """Non-numeric payout amount returns error."""
    coll_phone = "0244900013"
    _, invite = await _create_collector_and_login(client, coll_phone)
    await _create_client(client, invite, "0244900014")

    await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-008", "233244900014"),
    )
    await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-008", "233244900014", "Response", "3", 2),
    )
    resp = await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-008", "233244900014", "Response", "abc", 3),
    )
    data = resp.json()
    assert data["Type"] == "Release"
    assert "invalid" in data["Message"].lower()


@pytest.mark.asyncio
async def test_collector_info(client: AsyncClient, flush_ussd_keys):
    """Select option 4 returns collector name and phone."""
    coll_phone = "0244900015"
    _, invite = await _create_collector_and_login(client, coll_phone, "My Collector")
    await _create_client(client, invite, "0244900016")

    await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-009", "233244900016"),
    )
    resp = await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-009", "233244900016", "Response", "4", 2),
    )
    data = resp.json()
    assert data["Type"] == "Release"
    assert "My Collector" in data["Message"]
    assert coll_phone in data["Message"]


@pytest.mark.asyncio
async def test_exit_menu(client: AsyncClient, flush_ussd_keys):
    """Select option 0 releases with goodbye."""
    coll_phone = "0244900017"
    _, invite = await _create_collector_and_login(client, coll_phone)
    await _create_client(client, invite, "0244900018")

    await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-010", "233244900018"),
    )
    resp = await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-010", "233244900018", "Response", "0", 2),
    )
    data = resp.json()
    assert data["Type"] == "Release"
    assert "goodbye" in data["Message"].lower()


@pytest.mark.asyncio
async def test_invalid_menu_option(client: AsyncClient, flush_ussd_keys):
    """Invalid menu option shows menu again."""
    coll_phone = "0244900019"
    _, invite = await _create_collector_and_login(client, coll_phone)
    await _create_client(client, invite, "0244900020")

    await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-011", "233244900020"),
    )
    resp = await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-011", "233244900020", "Response", "9", 2),
    )
    data = resp.json()
    assert data["Type"] == "Response"
    assert "Invalid option" in data["Message"]
    assert "Check Balance" in data["Message"]


@pytest.mark.asyncio
async def test_session_timeout(client: AsyncClient, flush_ussd_keys):
    """Timeout type returns empty Release."""
    resp = await client.post(
        "/api/v1/ussd/callback",
        json=_ussd_request("sess-012", "233244900020", "Timeout"),
    )
    data = resp.json()
    assert data["Type"] == "Release"
    assert data["Message"] == ""
