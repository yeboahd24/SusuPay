from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_client
from app.models.client import Client
from app.schemas.client import ClientBalance, ClientProfile, ClientUpdateRequest
from app.services.balance_service import get_client_balance

router = APIRouter(prefix="/api/v1/clients", tags=["clients"])


@router.get("/me", response_model=ClientProfile)
async def get_profile(client: Client = Depends(get_current_client)):
    return client


@router.patch("/me", response_model=ClientProfile)
async def update_profile(
    body: ClientUpdateRequest,
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    if body.full_name is not None:
        client.full_name = body.full_name
    if body.daily_amount is not None:
        client.daily_amount = body.daily_amount
    if body.push_token is not None:
        client.push_token = body.push_token
    await db.commit()
    await db.refresh(client)
    return client


@router.get("/me/balance", response_model=ClientBalance)
async def get_balance(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    balance_data = await get_client_balance(db, client.id)
    if not balance_data["full_name"]:
        balance_data["full_name"] = client.full_name
    return ClientBalance(**balance_data)
