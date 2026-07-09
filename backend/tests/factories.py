import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.modules.auth.models import (
    PasswordResetTokenModel,
    RefreshTokenModel,
    UserModel,
)
from app.modules.household.models import HouseholdModel, InviteTokenModel


async def create_household(db: AsyncSession, **kwargs) -> HouseholdModel:
    h = HouseholdModel(name=kwargs.get("name", "Test Household"))
    db.add(h)
    await db.flush()
    return h


async def create_user(
    db: AsyncSession,
    household_id: int,
    **kwargs,
) -> UserModel:
    u = UserModel(
        email=kwargs.get("email", f"user{secrets.token_hex(4)}@test.com"),
        password_hash=hash_password(kwargs.get("password", "password123")),
        name=kwargs.get("name", "Test User"),
        role=kwargs.get("role", "member"),
        household_id=household_id,
    )
    db.add(u)
    await db.flush()
    return u


async def create_invite_token(
    db: AsyncSession,
    household_id: int,
    **kwargs,
) -> tuple[InviteTokenModel, str]:
    raw_token = kwargs.get("token", secrets.token_urlsafe(48))
    hashlib.sha256(raw_token.encode()).hexdigest()
    t = InviteTokenModel(
        household_id=household_id,
        token=raw_token,
        expires_at=kwargs.get(
            "expires_at",
            datetime.now(UTC) + timedelta(hours=24),
        ),
        used_at=kwargs.get("used_at"),
    )
    db.add(t)
    await db.flush()
    return t, raw_token


async def create_refresh_token(
    db: AsyncSession,
    user_id: int,
    household_id: int,
    **kwargs,
) -> tuple[RefreshTokenModel, str]:
    raw = kwargs.get("token", secrets.token_urlsafe(48))
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    t = RefreshTokenModel(
        user_id=user_id,
        household_id=household_id,
        token_hash=token_hash,
        expires_at=kwargs.get(
            "expires_at",
            datetime.now(UTC) + timedelta(days=30),
        ),
    )
    db.add(t)
    await db.flush()
    return t, raw


async def create_password_reset_token(
    db: AsyncSession,
    user_id: int,
    household_id: int,
    **kwargs,
) -> tuple[PasswordResetTokenModel, str]:
    raw = kwargs.get("token", secrets.token_urlsafe(32))
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    t = PasswordResetTokenModel(
        user_id=user_id,
        household_id=household_id,
        token=token_hash,
        expires_at=kwargs.get(
            "expires_at",
            datetime.now(UTC) + timedelta(hours=1),
        ),
        used_at=kwargs.get("used_at"),
    )
    db.add(t)
    await db.flush()
    return t, raw
