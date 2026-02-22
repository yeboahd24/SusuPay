import secrets
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.collector import Collector
from app.models.otp_code import OTPCode

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_pin(pin: str) -> str:
    return pwd_context.hash(pin)


def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    return pwd_context.verify(plain_pin, hashed_pin)


def hash_otp(code: str) -> str:
    return pwd_context.hash(code)


def verify_otp(plain_code: str, hashed_code: str) -> bool:
    return pwd_context.verify(plain_code, hashed_code)


def generate_otp() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


def generate_invite_code(full_name: str) -> str:
    slug = full_name.lower().strip().replace(" ", "-")
    # Keep only alphanumeric and hyphens
    slug = "".join(c for c in slug if c.isalnum() or c == "-")
    # Trim to reasonable length and add random suffix
    slug = slug[:30].strip("-")
    suffix = secrets.token_hex(2)
    return f"{slug}-{suffix}"


def create_access_token(subject_id: uuid.UUID, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(subject_id),
        "role": role,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject_id: uuid.UUID, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(subject_id),
        "role": role,
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_verification_token(phone: str, purpose: str) -> str:
    """Short-lived token proving OTP was verified. Valid for 10 minutes."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    payload = {
        "phone": phone,
        "purpose": purpose,
        "exp": expire,
        "type": "verification",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


async def check_otp_rate_limit(db: AsyncSession, phone: str) -> bool:
    """Returns True if under rate limit (3 OTPs per 10 minutes)."""
    ten_min_ago = datetime.now(timezone.utc) - timedelta(minutes=10)
    result = await db.execute(
        select(func.count())
        .select_from(OTPCode)
        .where(OTPCode.phone == phone)
        .where(OTPCode.created_at >= ten_min_ago)
    )
    count = result.scalar_one()
    return count < 3


async def get_collector_by_phone(db: AsyncSession, phone: str) -> Collector | None:
    result = await db.execute(select(Collector).where(Collector.phone == phone))
    return result.scalar_one_or_none()


async def get_collector_by_invite_code(db: AsyncSession, invite_code: str) -> Collector | None:
    result = await db.execute(
        select(Collector).where(Collector.invite_code == invite_code)
    )
    return result.scalar_one_or_none()
