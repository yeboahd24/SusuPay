from pydantic import BaseModel


class USSDRequest(BaseModel):
    SessionId: str
    ServiceCode: str
    PhoneNumber: str
    Type: str  # Initiation | Response | Release | Timeout
    Message: str = ""
    Operator: str | None = None
    Sequence: int = 1


class USSDResponse(BaseModel):
    SessionId: str
    Type: str  # Response | Release
    Message: str
    Label: str = "SusuPay"
