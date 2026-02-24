import pytest
from httpx import AsyncClient

from app.services.auth_service import (
    create_verification_token,
    generate_otp,
    hash_otp,
    hash_pin,
    verify_otp,
    verify_pin,
)


# --- Unit tests for auth helpers ---


def test_pin_hash_and_verify():
    pin = "1234"
    hashed = hash_pin(pin)
    assert verify_pin(pin, hashed)
    assert not verify_pin("0000", hashed)


def test_otp_hash_and_verify():
    code = generate_otp()
    assert len(code) == 6
    assert code.isdigit()
    hashed = hash_otp(code)
    assert verify_otp(code, hashed)
    assert not verify_otp("000000", hashed)


# --- Integration tests ---


@pytest.mark.asyncio
async def test_collector_registration_full_flow(client: AsyncClient):
    """Test the 4-step collector registration flow."""
    phone = "0244000001"

    # Step 1: Register
    resp = await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Ama Owusu", "phone": phone},
    )
    assert resp.status_code == 200
    assert resp.json()["phone"] == phone

    # Step 2: Send OTP
    resp = await client.post(
        "/api/v1/auth/otp/send",
        json={"phone": phone, "purpose": "REGISTER"},
    )
    assert resp.status_code == 200

    # Step 2b: Verify OTP — we need to get the code from DB
    # Since we can't easily get the plain code, create a verification token directly
    verification_token = create_verification_token(phone, "REGISTER")

    # Step 3: Set PIN
    resp = await client.post(
        "/api/v1/auth/collector/set-pin",
        json={
            "verification_token": verification_token,
            "pin": "1234",
            "pin_confirm": "1234",
        },
    )
    assert resp.status_code == 200

    # Step 4: Set MoMo number
    resp = await client.post(
        "/api/v1/auth/collector/set-momo",
        json={
            "verification_token": verification_token,
            "momo_number": "0244000001",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["invite_code"].startswith("ama-owusu-")
    assert data["collector_id"]


@pytest.mark.asyncio
async def test_collector_duplicate_phone_incomplete_allows_reregister(client: AsyncClient):
    """Incomplete registration (no PIN) allows re-registration with same phone."""
    phone = "0244000002"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Kofi Mensah", "phone": phone},
    )
    # Same phone, no PIN set yet — should succeed (replace stale record)
    resp = await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Another Name", "phone": phone},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_collector_duplicate_phone_complete_blocks(client: AsyncClient):
    """Fully registered collector (with PIN) blocks duplicate phone."""
    phone = "0244000099"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Kofi Mensah", "phone": phone},
    )
    verification_token = create_verification_token(phone, "REGISTER")
    await client.post(
        "/api/v1/auth/collector/set-pin",
        json={"verification_token": verification_token, "pin": "1234", "pin_confirm": "1234"},
    )
    # Now try registering with the same phone — should be blocked
    resp = await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Another Name", "phone": phone},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_collector_pin_mismatch(client: AsyncClient):
    """PIN and confirmation must match."""
    phone = "0244000003"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Test User", "phone": phone},
    )
    token = create_verification_token(phone, "REGISTER")
    resp = await client.post(
        "/api/v1/auth/collector/set-pin",
        json={
            "verification_token": token,
            "pin": "1234",
            "pin_confirm": "5678",
        },
    )
    assert resp.status_code == 400
    assert "do not match" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_collector_login(client: AsyncClient):
    """Collector can log in with phone + PIN."""
    phone = "0244000010"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Login Test", "phone": phone},
    )
    token = create_verification_token(phone, "REGISTER")
    await client.post(
        "/api/v1/auth/collector/set-pin",
        json={"verification_token": token, "pin": "4321", "pin_confirm": "4321"},
    )

    # Login
    resp = await client.post(
        "/api/v1/auth/collector/login",
        json={"phone": phone, "pin": "4321"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_collector_login_wrong_pin(client: AsyncClient):
    """Wrong PIN returns 401."""
    phone = "0244000011"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Wrong Pin", "phone": phone},
    )
    token = create_verification_token(phone, "REGISTER")
    await client.post(
        "/api/v1/auth/collector/set-pin",
        json={"verification_token": token, "pin": "1111", "pin_confirm": "1111"},
    )

    resp = await client.post(
        "/api/v1/auth/collector/login",
        json={"phone": phone, "pin": "9999"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_invite_resolve(client: AsyncClient):
    """Resolve an invite code to collector info."""
    phone = "0244000020"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Invite Test", "phone": phone},
    )
    token = create_verification_token(phone, "REGISTER")
    resp = await client.post(
        "/api/v1/auth/collector/set-momo",
        json={"verification_token": token, "momo_number": "0244000020"},
    )
    invite_code = resp.json()["invite_code"]

    # Resolve invite
    resp = await client.get(f"/api/v1/auth/invite/{invite_code}")
    assert resp.status_code == 200
    assert resp.json()["collector_name"] == "Invite Test"


@pytest.mark.asyncio
async def test_invite_invalid(client: AsyncClient):
    """Invalid invite code returns 404."""
    resp = await client.get("/api/v1/auth/invite/does-not-exist-0000")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_client_join(client: AsyncClient):
    """Client can join via invite code."""
    # Create a collector first
    phone = "0244000030"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Group Owner", "phone": phone},
    )
    token = create_verification_token(phone, "REGISTER")
    resp = await client.post(
        "/api/v1/auth/collector/set-momo",
        json={"verification_token": token, "momo_number": phone},
    )
    invite_code = resp.json()["invite_code"]

    # Client joins
    resp = await client.post(
        "/api/v1/auth/client/join",
        json={
            "invite_code": invite_code,
            "full_name": "Kofi Client",
            "phone": "0244100001",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_client_join_duplicate(client: AsyncClient):
    """Same phone can't join the same group twice."""
    phone = "0244000031"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Dup Group", "phone": phone},
    )
    token = create_verification_token(phone, "REGISTER")
    resp = await client.post(
        "/api/v1/auth/collector/set-momo",
        json={"verification_token": token, "momo_number": phone},
    )
    invite_code = resp.json()["invite_code"]

    join_body = {
        "invite_code": invite_code,
        "full_name": "Dup Client",
        "phone": "0244100002",
    }
    await client.post("/api/v1/auth/client/join", json=join_body)
    resp = await client.post("/api/v1/auth/client/join", json=join_body)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_token_refresh(client: AsyncClient):
    """Refresh token returns new access + refresh tokens."""
    phone = "0244000040"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Refresh Test", "phone": phone},
    )
    token = create_verification_token(phone, "REGISTER")
    await client.post(
        "/api/v1/auth/collector/set-pin",
        json={"verification_token": token, "pin": "1234", "pin_confirm": "1234"},
    )

    login_resp = await client.post(
        "/api/v1/auth/collector/login",
        json={"phone": phone, "pin": "1234"},
    )
    refresh_token = login_resp.json()["refresh_token"]

    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_protected_route_no_token(client: AsyncClient):
    """Protected route without token returns 403."""
    resp = await client.get("/api/v1/collectors/me")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_collector_profile(client: AsyncClient):
    """Authenticated collector can access their profile."""
    phone = "0244000050"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Profile Test", "phone": phone},
    )
    token = create_verification_token(phone, "REGISTER")
    await client.post(
        "/api/v1/auth/collector/set-pin",
        json={"verification_token": token, "pin": "1234", "pin_confirm": "1234"},
    )
    login_resp = await client.post(
        "/api/v1/auth/collector/login",
        json={"phone": phone, "pin": "1234"},
    )
    access_token = login_resp.json()["access_token"]

    resp = await client.get(
        "/api/v1/collectors/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Profile Test"
    assert resp.json()["phone"] == phone


@pytest.mark.asyncio
async def test_collector_dashboard(client: AsyncClient):
    """Collector dashboard returns correct counts."""
    phone = "0244000051"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Dashboard Test", "phone": phone},
    )
    token = create_verification_token(phone, "REGISTER")
    await client.post(
        "/api/v1/auth/collector/set-pin",
        json={"verification_token": token, "pin": "1234", "pin_confirm": "1234"},
    )
    login_resp = await client.post(
        "/api/v1/auth/collector/login",
        json={"phone": phone, "pin": "1234"},
    )
    access_token = login_resp.json()["access_token"]

    resp = await client.get(
        "/api/v1/collectors/me/dashboard",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_clients"] == 0
    assert data["pending_transactions"] == 0


@pytest.mark.asyncio
async def test_multi_tenant_isolation(client: AsyncClient):
    """Collector A cannot see Collector B's clients."""
    # Create Collector A with a client
    phone_a = "0244000060"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Collector A", "phone": phone_a},
    )
    token_a = create_verification_token(phone_a, "REGISTER")
    await client.post(
        "/api/v1/auth/collector/set-pin",
        json={"verification_token": token_a, "pin": "1234", "pin_confirm": "1234"},
    )
    resp = await client.post(
        "/api/v1/auth/collector/set-momo",
        json={"verification_token": token_a, "momo_number": phone_a},
    )
    invite_a = resp.json()["invite_code"]

    # Add a client to Collector A
    await client.post(
        "/api/v1/auth/client/join",
        json={
            "invite_code": invite_a,
            "full_name": "Client of A",
            "phone": "0244200001",
        },
    )

    # Create Collector B
    phone_b = "0244000061"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Collector B", "phone": phone_b},
    )
    token_b = create_verification_token(phone_b, "REGISTER")
    await client.post(
        "/api/v1/auth/collector/set-pin",
        json={"verification_token": token_b, "pin": "5678", "pin_confirm": "5678"},
    )

    # Login as Collector B
    login_b = await client.post(
        "/api/v1/auth/collector/login",
        json={"phone": phone_b, "pin": "5678"},
    )
    token_b_access = login_b.json()["access_token"]

    # Collector B should see 0 clients
    resp = await client.get(
        "/api/v1/collectors/me/clients",
        headers={"Authorization": f"Bearer {token_b_access}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_client_profile_and_balance(client: AsyncClient):
    """Client can view their profile and balance."""
    # Create collector and client
    phone = "0244000070"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Balance Owner", "phone": phone},
    )
    token = create_verification_token(phone, "REGISTER")
    resp = await client.post(
        "/api/v1/auth/collector/set-momo",
        json={"verification_token": token, "momo_number": phone},
    )
    invite_code = resp.json()["invite_code"]

    join_resp = await client.post(
        "/api/v1/auth/client/join",
        json={
            "invite_code": invite_code,
            "full_name": "Balance Client",
            "phone": "0244300001",
        },
    )
    client_token = join_resp.json()["access_token"]

    # Profile
    resp = await client.get(
        "/api/v1/clients/me",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Balance Client"

    # Balance (should be 0 with no transactions)
    resp = await client.get(
        "/api/v1/clients/me/balance",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert resp.status_code == 200
    assert float(resp.json()["balance"]) == 0.0


@pytest.mark.asyncio
async def test_collector_reset_pin(client: AsyncClient):
    """Collector can reset PIN via OTP flow."""
    phone = "0244000080"
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Reset Test", "phone": phone},
    )
    token = create_verification_token(phone, "REGISTER")
    await client.post(
        "/api/v1/auth/collector/set-pin",
        json={"verification_token": token, "pin": "1111", "pin_confirm": "1111"},
    )

    # Reset PIN with a RESET verification token
    reset_token = create_verification_token(phone, "RESET")
    resp = await client.post(
        "/api/v1/auth/collector/reset-pin",
        json={
            "verification_token": reset_token,
            "new_pin": "9999",
            "new_pin_confirm": "9999",
        },
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()

    # Old PIN should fail
    resp = await client.post(
        "/api/v1/auth/collector/login",
        json={"phone": phone, "pin": "1111"},
    )
    assert resp.status_code == 401

    # New PIN should work
    resp = await client.post(
        "/api/v1/auth/collector/login",
        json={"phone": phone, "pin": "9999"},
    )
    assert resp.status_code == 200
