import ssl as ssl_module
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

ssl_ctx = ssl_module.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl_module.CERT_NONE

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_DEBUG,
    connect_args={"ssl": ssl_ctx, "statement_cache_size": 0, "prepared_statement_cache_size": 0},
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
