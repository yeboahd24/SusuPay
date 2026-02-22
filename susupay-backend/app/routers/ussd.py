from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.ussd import USSDRequest, USSDResponse
from app.services.ussd_service import handle_ussd

router = APIRouter(prefix="/api/v1/ussd", tags=["ussd"])


@router.post("/callback", response_model=USSDResponse)
async def ussd_callback(
    request: USSDRequest,
    db: AsyncSession = Depends(get_db),
):
    return await handle_ussd(db, request)
