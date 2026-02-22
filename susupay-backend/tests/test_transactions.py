import io

import pytest
from httpx import AsyncClient
from PIL import Image

from app.services.auth_service import create_verification_token


async def _create_collector_and_login(client: AsyncClient, phone: str, name: str = "Test Collector") -> tuple[str, str]:
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


async def _create_client(client: AsyncClient, invite_code: str, phone: str, name: str = "Test Client") -> tuple[str, str]:
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
    # Get client ID from profile
    profile = await client.get(
        "/api/v1/clients/me",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    return client_token, profile.json()["id"]


STANDARD_SMS = (
    "You have sent GHS 20.00 to Test Collector ({momo}).\n"
    "Transaction ID: {txn_id}\n"
    "Date: 22/02/2026 10:34 AM\n"
    "Your new balance is GHS 130.00"
)


@pytest.mark.asyncio
async def test_sms_submission_high_trust(client: AsyncClient):
    """SMS submission with all validations passing gets HIGH trust."""
    collector_phone = "0244500001"
    access_token, invite_code = await _create_collector_and_login(client, collector_phone)
    _, client_id = await _create_client(client, invite_code, "0244600001")

    sms = STANDARD_SMS.format(momo=collector_phone, txn_id="HIGHTRUST01")
    resp = await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "sms_text": sms},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "PENDING"
    assert data["trust_level"] == "HIGH"
    assert data["parsed"]["amount"] == 20.0
    assert data["parsed"]["confidence"] == "HIGH"
    assert data["parsed"]["transaction_id"] == "HIGHTRUST01"


@pytest.mark.asyncio
async def test_sms_submission_phone_mismatch(client: AsyncClient):
    """SMS with wrong recipient phone gets MEDIUM trust with flag."""
    collector_phone = "0244500002"
    access_token, invite_code = await _create_collector_and_login(client, collector_phone)
    _, client_id = await _create_client(client, invite_code, "0244600002")

    # SMS has a different phone than the collector's momo
    sms = STANDARD_SMS.format(momo="0244999999", txn_id="MISMATCH01")
    resp = await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "sms_text": sms},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["trust_level"] == "MEDIUM"
    assert any(f["field"] == "recipient_phone" for f in data["validation_flags"])


@pytest.mark.asyncio
async def test_duplicate_txn_id_auto_rejected(client: AsyncClient):
    """Duplicate MTN transaction ID gets AUTO_REJECTED."""
    collector_phone = "0244500003"
    access_token, invite_code = await _create_collector_and_login(client, collector_phone)
    _, client_id = await _create_client(client, invite_code, "0244600003")

    sms = STANDARD_SMS.format(momo=collector_phone, txn_id="DUPETEST01")

    # First submission - should succeed
    resp1 = await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "sms_text": sms},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "PENDING"

    # Second submission with same txn ID - should be auto-rejected
    resp2 = await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "sms_text": sms},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "AUTO_REJECTED"
    assert resp2.json()["trust_level"] == "AUTO_REJECTED"


@pytest.mark.asyncio
async def test_screenshot_submission_low_trust(client: AsyncClient):
    """Screenshot submission gets LOW trust."""
    collector_phone = "0244500004"
    access_token, invite_code = await _create_collector_and_login(client, collector_phone)
    _, client_id = await _create_client(client, invite_code, "0244600004")

    # Create a valid JPEG for the multipart upload
    img = Image.new("RGB", (100, 100), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    jpeg_bytes = buf.getvalue()

    resp = await client.post(
        "/api/v1/transactions/submit/screenshot",
        data={"client_id": client_id, "amount": "50.0"},
        files={"screenshot": ("proof.jpg", jpeg_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "PENDING"
    assert data["trust_level"] == "LOW"


@pytest.mark.asyncio
async def test_pending_feed(client: AsyncClient):
    """Collector can see pending transactions in the feed."""
    collector_phone = "0244500005"
    access_token, invite_code = await _create_collector_and_login(client, collector_phone)
    _, client_id = await _create_client(client, invite_code, "0244600005", "Feed Client")

    sms = STANDARD_SMS.format(momo=collector_phone, txn_id="FEEDTEST01")
    await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "sms_text": sms},
        headers={"Authorization": f"Bearer {access_token}"},
    )

    resp = await client.get(
        "/api/v1/transactions/feed",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert items[0]["client_name"] == "Feed Client"
    assert items[0]["status"] == "PENDING"


@pytest.mark.asyncio
async def test_confirm_transaction(client: AsyncClient):
    """Collector confirms a pending transaction."""
    collector_phone = "0244500006"
    access_token, invite_code = await _create_collector_and_login(client, collector_phone)
    _, client_id = await _create_client(client, invite_code, "0244600006")

    sms = STANDARD_SMS.format(momo=collector_phone, txn_id="CONFIRM01")
    submit_resp = await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "sms_text": sms},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    txn_id = submit_resp.json()["transaction_id"]

    resp = await client.post(
        f"/api/v1/transactions/{txn_id}/confirm",
        json={},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "CONFIRMED"
    assert resp.json()["confirmed_at"] is not None


@pytest.mark.asyncio
async def test_query_transaction(client: AsyncClient):
    """Collector queries a pending transaction with a note."""
    collector_phone = "0244500007"
    access_token, invite_code = await _create_collector_and_login(client, collector_phone)
    _, client_id = await _create_client(client, invite_code, "0244600007")

    sms = STANDARD_SMS.format(momo=collector_phone, txn_id="QUERY01")
    submit_resp = await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "sms_text": sms},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    txn_id = submit_resp.json()["transaction_id"]

    resp = await client.post(
        f"/api/v1/transactions/{txn_id}/query",
        json={"note": "Amount does not match"},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "QUERIED"


@pytest.mark.asyncio
async def test_reject_queried_transaction(client: AsyncClient):
    """Collector can reject a transaction that was previously queried."""
    collector_phone = "0244500008"
    access_token, invite_code = await _create_collector_and_login(client, collector_phone)
    _, client_id = await _create_client(client, invite_code, "0244600008")

    sms = STANDARD_SMS.format(momo=collector_phone, txn_id="REJECT01")
    submit_resp = await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "sms_text": sms},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    txn_id = submit_resp.json()["transaction_id"]

    # Query first
    await client.post(
        f"/api/v1/transactions/{txn_id}/query",
        json={"note": "Suspicious"},
        headers={"Authorization": f"Bearer {access_token}"},
    )

    # Then reject
    resp = await client.post(
        f"/api/v1/transactions/{txn_id}/reject",
        json={"note": "Confirmed fake"},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "REJECTED"


@pytest.mark.asyncio
async def test_cannot_reject_pending(client: AsyncClient):
    """Cannot reject a PENDING transaction (must query first)."""
    collector_phone = "0244500009"
    access_token, invite_code = await _create_collector_and_login(client, collector_phone)
    _, client_id = await _create_client(client, invite_code, "0244600009")

    sms = STANDARD_SMS.format(momo=collector_phone, txn_id="NOREJECT01")
    submit_resp = await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "sms_text": sms},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    txn_id = submit_resp.json()["transaction_id"]

    resp = await client.post(
        f"/api/v1/transactions/{txn_id}/reject",
        json={"note": "Trying to reject pending"},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_confirm_updates_balance(client: AsyncClient):
    """Confirming a transaction updates the client's balance."""
    collector_phone = "0244500010"
    access_token, invite_code = await _create_collector_and_login(client, collector_phone)
    client_token, client_id = await _create_client(client, invite_code, "0244600010")

    # Check balance before
    bal_before = await client.get(
        "/api/v1/clients/me/balance",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert float(bal_before.json()["balance"]) == 0.0

    # Submit and confirm
    sms = STANDARD_SMS.format(momo=collector_phone, txn_id="BALANCE01")
    submit_resp = await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "sms_text": sms},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    txn_id = submit_resp.json()["transaction_id"]

    await client.post(
        f"/api/v1/transactions/{txn_id}/confirm",
        json={},
        headers={"Authorization": f"Bearer {access_token}"},
    )

    # Check balance after
    bal_after = await client.get(
        "/api/v1/clients/me/balance",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert float(bal_after.json()["balance"]) == 20.0


@pytest.mark.asyncio
async def test_client_history(client: AsyncClient):
    """Client can see their transaction history (excludes AUTO_REJECTED)."""
    collector_phone = "0244500011"
    access_token, invite_code = await _create_collector_and_login(client, collector_phone)
    client_token, client_id = await _create_client(client, invite_code, "0244600011")

    # Submit a transaction
    sms = STANDARD_SMS.format(momo=collector_phone, txn_id="HISTORY01")
    await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id, "sms_text": sms},
        headers={"Authorization": f"Bearer {access_token}"},
    )

    resp = await client.get(
        "/api/v1/transactions/my-history",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert items[0]["amount"] == "20.00"


@pytest.mark.asyncio
async def test_multi_tenant_transaction_isolation(client: AsyncClient):
    """Collector B cannot see or act on Collector A's transactions."""
    # Setup Collector A
    phone_a = "0244500020"
    token_a, invite_a = await _create_collector_and_login(client, phone_a, "Collector A")
    _, client_id_a = await _create_client(client, invite_a, "0244600020")

    sms = STANDARD_SMS.format(momo=phone_a, txn_id="ISOLATE01")
    submit_resp = await client.post(
        "/api/v1/transactions/submit/sms",
        json={"client_id": client_id_a, "sms_text": sms},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    txn_id = submit_resp.json()["transaction_id"]

    # Setup Collector B
    phone_b = "0244500021"
    token_b, _ = await _create_collector_and_login(client, phone_b, "Collector B")

    # Collector B sees empty feed
    resp = await client.get(
        "/api/v1/transactions/feed",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 0

    # Collector B cannot confirm A's transaction
    resp = await client.post(
        f"/api/v1/transactions/{txn_id}/confirm",
        json={},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 400
