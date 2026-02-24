"""Integration test for screenshot upload via the API endpoint."""

import io

import pytest
from httpx import AsyncClient
from PIL import Image

from app.services.auth_service import create_verification_token


def _make_jpeg_bytes() -> bytes:
    img = Image.new("RGB", (100, 100), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


async def _create_collector_and_login(
    client: AsyncClient, phone: str
) -> tuple[str, str]:
    await client.post(
        "/api/v1/auth/collector/register",
        json={"full_name": "Screenshot Collector", "phone": phone},
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
    client: AsyncClient, invite_code: str, phone: str
) -> tuple[str, str]:
    resp = await client.post(
        "/api/v1/auth/client/join",
        json={
            "invite_code": invite_code,
            "full_name": "Upload Client",
            "phone": phone,
        },
    )
    client_token = resp.json()["access_token"]
    profile = await client.get(
        "/api/v1/clients/me",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    return client_token, profile.json()["id"]


@pytest.mark.asyncio
async def test_screenshot_upload_endpoint(client: AsyncClient):
    """Screenshot upload with valid JPEG returns LOW trust transaction."""
    collector_phone = "0244500050"
    access_token, invite_code = await _create_collector_and_login(client, collector_phone)
    _, client_id = await _create_client(client, invite_code, "0244600050")

    jpeg_bytes = _make_jpeg_bytes()

    resp = await client.post(
        "/api/v1/transactions/submit/screenshot",
        data={"client_id": client_id, "amount": "25.00"},
        files={"screenshot": ("proof.jpg", jpeg_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "PENDING"
    assert data["trust_level"] == "LOW"


@pytest.mark.asyncio
async def test_screenshot_upload_rejects_invalid_mime(client: AsyncClient):
    """Screenshot upload rejects non-image MIME types."""
    collector_phone = "0244500051"
    access_token, invite_code = await _create_collector_and_login(client, collector_phone)
    _, client_id = await _create_client(client, invite_code, "0244600051")

    resp = await client.post(
        "/api/v1/transactions/submit/screenshot",
        data={"client_id": client_id, "amount": "25.00"},
        files={"screenshot": ("file.txt", b"not an image", "text/plain")},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 400
    assert "Invalid file type" in resp.json()["detail"]
