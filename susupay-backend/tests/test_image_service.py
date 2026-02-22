"""Tests for the S3 image upload service."""

import io
import uuid

import pytest
from PIL import Image

from app.services.image_service import (
    ImageValidationError,
    generate_signed_url,
    upload_screenshot,
    validate_image,
)


def _make_jpeg(width: int = 100, height: int = 100) -> bytes:
    """Create a minimal valid JPEG image in memory."""
    img = Image.new("RGB", (width, height), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_png(width: int = 100, height: int = 100) -> bytes:
    """Create a minimal valid PNG image in memory."""
    img = Image.new("RGBA", (width, height), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# --- validate_image ---


def test_validate_valid_jpeg():
    content = _make_jpeg()
    validate_image(content, "image/jpeg")  # should not raise


def test_validate_valid_png():
    content = _make_png()
    validate_image(content, "image/png")  # should not raise


def test_validate_rejects_invalid_mime():
    content = _make_jpeg()
    with pytest.raises(ImageValidationError, match="Invalid file type"):
        validate_image(content, "image/gif")


def test_validate_rejects_text_mime():
    with pytest.raises(ImageValidationError, match="Invalid file type"):
        validate_image(b"not an image", "text/plain")


def test_validate_rejects_oversized():
    # Create content just over 5MB
    oversized = b"\x00" * (5 * 1024 * 1024 + 1)
    with pytest.raises(ImageValidationError, match="File too large"):
        validate_image(oversized, "image/jpeg")


def test_validate_rejects_corrupt_image():
    with pytest.raises(ImageValidationError, match="not a valid image"):
        validate_image(b"definitely not image bytes", "image/jpeg")


# --- upload_screenshot (dev mode, no real S3) ---


@pytest.mark.asyncio
async def test_upload_screenshot_returns_key():
    """In dev mode (no AWS keys), returns the S3 key without uploading."""
    content = _make_jpeg()
    collector_id = uuid.uuid4()
    client_id = uuid.uuid4()

    key = await upload_screenshot(content, "image/jpeg", collector_id, client_id)

    assert key.startswith(f"screenshots/{collector_id}/{client_id}/")
    assert key.endswith(".jpg")


@pytest.mark.asyncio
async def test_upload_screenshot_png_extension():
    content = _make_png()
    collector_id = uuid.uuid4()
    client_id = uuid.uuid4()

    key = await upload_screenshot(content, "image/png", collector_id, client_id)
    assert key.endswith(".png")


@pytest.mark.asyncio
async def test_upload_screenshot_rejects_invalid():
    with pytest.raises(ImageValidationError, match="Invalid file type"):
        await upload_screenshot(
            b"data", "image/gif", uuid.uuid4(), uuid.uuid4()
        )


# --- generate_signed_url (dev mode) ---


def test_generate_signed_url_dev_mode():
    key = "screenshots/test/test/abc.jpg"
    url = generate_signed_url(key)
    assert "abc.jpg" in url
    assert "signed=dev" in url


def test_generate_signed_url_custom_expiry():
    key = "screenshots/test/test/abc.jpg"
    url = generate_signed_url(key, expiry_seconds=7200)
    assert "abc.jpg" in url
