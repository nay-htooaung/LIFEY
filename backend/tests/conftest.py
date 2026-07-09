import asyncio
import hashlib
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import create_access_token
from app.main import app
from app.shared import database
from app.shared.base import Base

# Override database URL for tests
settings.database_url = "sqlite+aiosqlite:///./test.db"
settings.debug = True

# Create a test engine and override the shared module's factory
test_engine = create_async_engine(settings.database_url, echo=False)
database.engine = test_engine
database.async_session_factory = async_sessionmaker(
    test_engine,
    expire_on_commit=False,
)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.connect() as conn:
        await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        yield session
        await session.close()
        await conn.rollback()


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


def create_test_token(
    user_id: int,
    household_id: int,
    token_type: str = "access",
) -> str:
    return create_access_token(
        {"user_id": user_id, "household_id": household_id, "type": token_type},
    )
