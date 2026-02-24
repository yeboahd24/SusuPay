import uuid
from pydantic import BaseModel, Field


# --- OTP ---
class OTPSendRequest(BaseModel):
    phone: str = Field(..., pattern=r"^0\d{9}$", examples=["0244123456"])
    purpose: str = Field(..., pattern=r"^(REGISTER|LOGIN|RESET)$")


class OTPSendResponse(BaseModel):
    message: str = "OTP sent successfully"
    debug_code: str | None = None


class OTPVerifyRequest(BaseModel):
    phone: str = Field(..., pattern=r"^0\d{9}$")
    code: str = Field(..., min_length=6, max_length=6)
    purpose: str = Field(..., pattern=r"^(REGISTER|LOGIN|RESET)$")


class OTPVerifyResponse(BaseModel):
    verification_token: str


# --- Collector Registration ---
class CollectorRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., pattern=r"^0\d{9}$")


class CollectorRegisterResponse(BaseModel):
    message: str = "Registration started. Verify your phone with OTP."
    phone: str


class CollectorSetPinRequest(BaseModel):
    verification_token: str
    pin: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")
    pin_confirm: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")


class CollectorSetPinResponse(BaseModel):
    message: str = "PIN set successfully"


class CollectorSetMomoRequest(BaseModel):
    verification_token: str
    momo_number: str = Field(..., pattern=r"^0\d{9}$")
    contribution_amount: float = Field(..., gt=0, description="Daily/weekly/monthly contribution in GHS")
    contribution_frequency: str = Field(
        "DAILY", pattern=r"^(DAILY|WEEKLY|MONTHLY)$", description="How often clients pay"
    )


class CollectorSetMomoResponse(BaseModel):
    message: str = "Registration complete"
    collector_id: uuid.UUID
    invite_code: str


# --- Collector Login ---
class CollectorLoginRequest(BaseModel):
    phone: str = Field(..., pattern=r"^0\d{9}$")
    pin: str = Field(..., min_length=4, max_length=4)


# --- Collector Reset PIN ---
class CollectorResetPinRequest(BaseModel):
    verification_token: str
    new_pin: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")
    new_pin_confirm: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")


# --- Client Login ---
class ClientLoginRequest(BaseModel):
    phone: str = Field(..., pattern=r"^0\d{9}$")
    code: str = Field(..., min_length=6, max_length=6)


# --- Token ---
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefreshRequest(BaseModel):
    refresh_token: str


# --- Invite ---
class InviteInfoResponse(BaseModel):
    collector_name: str
    invite_code: str


# --- Client Join ---
class ClientJoinRequest(BaseModel):
    invite_code: str
    full_name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., pattern=r"^0\d{9}$")
