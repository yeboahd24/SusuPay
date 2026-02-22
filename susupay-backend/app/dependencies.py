import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.client import Client
from app.models.collector import Collector
from app.services.auth_service import decode_token

security = HTTPBearer()


async def get_current_collector(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Collector:
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access" or payload.get("role") != "COLLECTOR":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    collector_id = uuid.UUID(payload["sub"])
    result = await db.execute(
        select(Collector).where(Collector.id == collector_id, Collector.is_active == True)  # noqa: E712
    )
    collector = result.scalar_one_or_none()
    if collector is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Collector not found or inactive",
        )
    return collector


async def get_current_client(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Client:
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access" or payload.get("role") != "CLIENT":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    client_id = uuid.UUID(payload["sub"])
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.is_active == True)  # noqa: E712
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Client not found or inactive",
        )
    return client
