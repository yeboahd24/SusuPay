"""
S3 image upload service for screenshot submissions.

- Private ACL, signed URLs (1h expiry)
- MIME validation: jpeg/png only
- Max 5MB file size
"""

import uuid
from io import BytesIO

import boto3
from botocore.exceptions import ClientError
from PIL import Image

from app.config import settings

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


class ImageValidationError(Exception):
    pass


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


def _get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


def _extension_for_mime(content_type: str) -> str:
    return "jpg" if content_type == "image/jpeg" else "png"


async def upload_screenshot(
    content: bytes,
    content_type: str,
    collector_id: uuid.UUID,
    client_id: uuid.UUID,
) -> str:
    """
    Upload a screenshot to S3.
    Returns the S3 object key.
    """
    validate_image(content, content_type)

    ext = _extension_for_mime(content_type)
    key = f"screenshots/{collector_id}/{client_id}/{uuid.uuid4()}.{ext}"

    if not settings.AWS_ACCESS_KEY_ID:
        # Dev mode: skip actual upload, return the key
        return key

    s3 = _get_s3_client()
    s3.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=key,
        Body=content,
        ContentType=content_type,
        ACL="private",
    )
    return key


def generate_signed_url(key: str, expiry_seconds: int = 3600) -> str:
    """Generate a pre-signed URL for a private S3 object. Default 1h expiry."""
    if not settings.AWS_ACCESS_KEY_ID:
        # Dev mode: return a placeholder URL
        return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}?signed=dev"

    s3 = _get_s3_client()
    try:
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET_NAME, "Key": key},
            ExpiresIn=expiry_seconds,
        )
        return url
    except ClientError:
        return ""
