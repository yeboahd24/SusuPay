from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.client import Client
from app.models.collector import Collector
from app.models.otp_code import OTPCode
from app.schemas.auth import (
    ClientJoinRequest,
    ClientLoginRequest,
    CollectorLoginRequest,
    CollectorRegisterRequest,
    CollectorRegisterResponse,
    CollectorResetPinRequest,
    CollectorSetMomoRequest,
    CollectorSetMomoResponse,
    CollectorSetPinRequest,
    CollectorSetPinResponse,
    InviteInfoResponse,
    OTPSendRequest,
    OTPSendResponse,
    OTPVerifyRequest,
    OTPVerifyResponse,
    TokenRefreshRequest,
    TokenResponse,
)
from app.services.auth_service import (
    check_otp_rate_limit,
    create_access_token,
    create_refresh_token,
    create_verification_token,
    decode_token,
    generate_invite_code,
    generate_otp,
    get_collector_by_invite_code,
    get_collector_by_phone,
    hash_otp,
    hash_pin,
    verify_otp,
    verify_pin,
)
from app.services.sms_service import send_sms

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# --- OTP ---


@router.post("/otp/send", response_model=OTPSendResponse)
async def send_otp(body: OTPSendRequest, db: AsyncSession = Depends(get_db)):
    # Rate limit check
    if not await check_otp_rate_limit(db, body.phone):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Try again in 10 minutes.",
        )

    code = generate_otp()
    otp = OTPCode(
        phone=body.phone,
        code_hash=hash_otp(code),
        purpose=body.purpose,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db.add(otp)
    await db.commit()

    await send_sms(body.phone, f"Your SusuPay code is {code}. Expires in 5 minutes.")

    return OTPSendResponse()


@router.post("/otp/verify", response_model=OTPVerifyResponse)
async def verify_otp_endpoint(body: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(OTPCode)
        .where(
            OTPCode.phone == body.phone,
            OTPCode.purpose == body.purpose,
            OTPCode.used == False,  # noqa: E712
            OTPCode.expires_at > now,
        )
        .order_by(OTPCode.created_at.desc())
        .limit(1)
    )
    otp = result.scalar_one_or_none()

    if otp is None or not verify_otp(body.code, otp.code_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    otp.used = True
    await db.commit()

    token = create_verification_token(body.phone, body.purpose)
    return OTPVerifyResponse(verification_token=token)


# --- Collector Registration ---


@router.post("/collector/register", response_model=CollectorRegisterResponse)
async def collector_register(body: CollectorRegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await get_collector_by_phone(db, body.phone)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered",
        )

    invite_code = generate_invite_code(body.full_name)
    collector = Collector(
        full_name=body.full_name,
        phone=body.phone,
        invite_code=invite_code,
    )
    db.add(collector)
    await db.commit()

    return CollectorRegisterResponse(phone=body.phone)


@router.post("/collector/set-pin", response_model=CollectorSetPinResponse)
async def collector_set_pin(body: CollectorSetPinRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.verification_token)
    if payload is None or payload.get("type") != "verification":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token")

    if body.pin != body.pin_confirm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PINs do not match")

    phone = payload["phone"]
    collector = await get_collector_by_phone(db, phone)
    if collector is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collector not found")

    collector.pin_hash = hash_pin(body.pin)
    await db.commit()

    return CollectorSetPinResponse()


@router.post("/collector/set-momo", response_model=CollectorSetMomoResponse)
async def collector_set_momo(body: CollectorSetMomoRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.verification_token)
    if payload is None or payload.get("type") != "verification":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token")

    phone = payload["phone"]
    collector = await get_collector_by_phone(db, phone)
    if collector is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collector not found")

    collector.momo_number = body.momo_number
    await db.commit()

    return CollectorSetMomoResponse(
        collector_id=collector.id,
        invite_code=collector.invite_code,
    )


# --- Collector Login ---


@router.post("/collector/login", response_model=TokenResponse)
async def collector_login(body: CollectorLoginRequest, db: AsyncSession = Depends(get_db)):
    collector = await get_collector_by_phone(db, body.phone)
    if collector is None or collector.pin_hash is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_pin(body.pin, collector.pin_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not collector.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    return TokenResponse(
        access_token=create_access_token(collector.id, "COLLECTOR"),
        refresh_token=create_refresh_token(collector.id, "COLLECTOR"),
    )


# --- Collector Reset PIN ---


@router.post("/collector/reset-pin", response_model=TokenResponse)
async def collector_reset_pin(body: CollectorResetPinRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.verification_token)
    if payload is None or payload.get("type") != "verification" or payload.get("purpose") != "RESET":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token")

    if body.new_pin != body.new_pin_confirm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PINs do not match")

    phone = payload["phone"]
    collector = await get_collector_by_phone(db, phone)
    if collector is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collector not found")

    collector.pin_hash = hash_pin(body.new_pin)
    await db.commit()

    return TokenResponse(
        access_token=create_access_token(collector.id, "COLLECTOR"),
        refresh_token=create_refresh_token(collector.id, "COLLECTOR"),
    )


# --- Invite ---


@router.get("/invite/{invite_code}", response_model=InviteInfoResponse)
async def resolve_invite(invite_code: str, db: AsyncSession = Depends(get_db)):
    collector = await get_collector_by_invite_code(db, invite_code)
    if collector is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite link")
    return InviteInfoResponse(collector_name=collector.full_name, invite_code=collector.invite_code)


# --- Client Join ---


@router.post("/client/join", response_model=TokenResponse)
async def client_join(body: ClientJoinRequest, db: AsyncSession = Depends(get_db)):
    collector = await get_collector_by_invite_code(db, body.invite_code)
    if collector is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite code")

    # Check if client already exists for this collector
    result = await db.execute(
        select(Client).where(
            Client.collector_id == collector.id,
            Client.phone == body.phone,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone already registered in this group",
        )

    client = Client(
        collector_id=collector.id,
        full_name=body.full_name,
        phone=body.phone,
        daily_amount=body.daily_amount,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)

    return TokenResponse(
        access_token=create_access_token(client.id, "CLIENT"),
        refresh_token=create_refresh_token(client.id, "CLIENT"),
    )


# --- Client Login ---


@router.post("/client/login", response_model=TokenResponse)
async def client_login(body: ClientLoginRequest, db: AsyncSession = Depends(get_db)):
    # Verify OTP inline (client login is phone + OTP in one step)
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(OTPCode)
        .where(
            OTPCode.phone == body.phone,
            OTPCode.purpose == "LOGIN",
            OTPCode.used == False,  # noqa: E712
            OTPCode.expires_at > now,
        )
        .order_by(OTPCode.created_at.desc())
        .limit(1)
    )
    otp = result.scalar_one_or_none()

    if otp is None or not verify_otp(body.code, otp.code_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired OTP")

    otp.used = True

    # Find client by phone
    result = await db.execute(
        select(Client).where(Client.phone == body.phone, Client.is_active == True)  # noqa: E712
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    await db.commit()

    return TokenResponse(
        access_token=create_access_token(client.id, "CLIENT"),
        refresh_token=create_refresh_token(client.id, "CLIENT"),
    )


# --- Token Refresh ---


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: TokenRefreshRequest):
    payload = decode_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    subject_id = payload["sub"]
    role = payload["role"]

    return TokenResponse(
        access_token=create_access_token(subject_id, role),
        refresh_token=create_refresh_token(subject_id, role),
    )
