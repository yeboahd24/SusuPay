"""
Cloudinary image upload service for screenshot submissions.

- MIME validation: jpeg/png only
- Max 5MB file size
"""

import uuid
from io import BytesIO

import cloudinary
import cloudinary.uploader
from PIL import Image

from app.config import settings

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

_configured = False


class ImageValidationError(Exception):
    pass


def _ensure_configured() -> None:
    global _configured
    if not _configured and settings.CLOUDINARY_CLOUD_NAME:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )
        _configured = True


def validate_image(content: bytes, content_type: str) -> None:
    """Validate image MIME type and size."""
    if content_type not in ALLOWED_MIME_TYPES:
        raise ImageValidationError(
            f"Invalid file type: {content_type}. Only JPEG and PNG allowed."
        )

    if len(content) > MAX_FILE_SIZE:
        raise ImageValidationError(
            f"File too large: {len(content)} bytes. Maximum is {MAX_FILE_SIZE} bytes (5MB)."
        )

    # Verify it's actually an image by opening with Pillow
    try:
        img = Image.open(BytesIO(content))
        img.verify()
    except Exception:
        raise ImageValidationError("File is not a valid image.")


async def upload_screenshot(
    content: bytes,
    content_type: str,
    collector_id: uuid.UUID,
    client_id: uuid.UUID,
) -> str:
    """
    Upload a screenshot to Cloudinary.
    Returns the Cloudinary public_id (used to build URLs).
    """
    validate_image(content, content_type)

    public_id = f"susupay/screenshots/{collector_id}/{client_id}/{uuid.uuid4()}"

    if not settings.CLOUDINARY_CLOUD_NAME:
        # Dev mode: skip actual upload, return the public_id
        return public_id

    _ensure_configured()
    result = cloudinary.uploader.upload(
        BytesIO(content),
        public_id=public_id,
        resource_type="image",
        type="private",
    )
    return result["public_id"]


def generate_signed_url(public_id: str, expiry_seconds: int = 3600) -> str:
    """Generate a signed URL for a private Cloudinary image. Default 1h expiry."""
    if not settings.CLOUDINARY_CLOUD_NAME:
        return f"https://res.cloudinary.com/demo/image/private/{public_id}.jpg?dev=true"

    _ensure_configured()
    import time

    url = cloudinary.utils.private_download_url(
        public_id,
        "jpg",
        expires_at=int(time.time()) + expiry_seconds,
    )
    return url
