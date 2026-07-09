import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    ConflictException,
    NotFoundException,
    UnauthorizedException,
    ValidationException,
)
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.modules.household.models import HouseholdModel, InviteTokenModel

from .models import PasswordResetTokenModel, RefreshTokenModel, UserModel


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def register(
    db: AsyncSession,
    name: str,
    email: str,
    password: str,
    invite_token: str | None = None,
) -> dict:
    existing = (
        await db.execute(select(UserModel).where(UserModel.email == email))
    ).scalar_one_or_none()

    if invite_token:
        invite = (
            await db.execute(
                select(InviteTokenModel).where(InviteTokenModel.token == invite_token),
            )
        ).scalar_one_or_none()

        if not invite:
            msg = "Invalid invite token"
            raise ValidationException(msg)
        if invite.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
            msg = "Invite token has expired"
            raise ValidationException(msg)
        if invite.used_at is not None:
            msg = "Invite token has already been used"
            raise ValidationException(msg)

        if existing and existing.household_id == invite.household_id:
            # User already in target household — return login data
            return await _build_auth_response(db, existing)

        invite.used_at = datetime.now(UTC).replace(microsecond=0)
        household_id = invite.household_id
        role = "member"
    else:
        if existing:
            msg = "Email already registered"
            raise ConflictException(msg)
        household = HouseholdModel(name=f"{name}'s Household")
        db.add(household)
        await db.flush()
        household_id = household.id
        role = "admin"

    if not existing:
        password_hash = hash_password(password)
        user = UserModel(
            name=name,
            email=email,
            password_hash=password_hash,
            role=role,
            household_id=household_id,
        )
        db.add(user)
        await db.flush()
    else:
        user = existing

    return await _build_auth_response(db, user)


async def _build_auth_response(db: AsyncSession, user: UserModel) -> dict:
    household = (
        await db.execute(
            select(HouseholdModel).where(HouseholdModel.id == user.household_id),
        )
    ).scalar_one_or_none()

    access_token = create_access_token(
        {"user_id": user.id, "household_id": user.household_id},
    )
    refresh_token_value = secrets.token_urlsafe(48)
    refresh_token_hash = _hash_token(refresh_token_value)
    refresh_expires = datetime.now(UTC) + timedelta(
        days=settings.refresh_token_expire_days,
    )

    # Rotate: delete old refresh tokens, insert new one
    await db.execute(
        delete(RefreshTokenModel).where(
            RefreshTokenModel.user_id == user.id,
            RefreshTokenModel.household_id == user.household_id,
        ),
    )
    db.add(
        RefreshTokenModel(
            user_id=user.id,
            household_id=user.household_id,
            token_hash=refresh_token_hash,
            expires_at=refresh_expires,
        ),
    )
    await db.flush()

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
        "household": {
            "id": household.id,
            "name": household.name,
        },
        "access_token": access_token,
        "refresh_token": refresh_token_value,
        "refresh_expires": refresh_expires,
    }


async def login(db: AsyncSession, email: str, password: str) -> dict:
    user = (
        await db.execute(select(UserModel).where(UserModel.email == email))
    ).scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        msg = "Invalid email or password"
        raise UnauthorizedException(msg)

    return await _build_auth_response(db, user)


async def logout(db: AsyncSession, user_id: int, household_id: int) -> None:
    await db.execute(
        delete(RefreshTokenModel).where(
            RefreshTokenModel.user_id == user_id,
            RefreshTokenModel.household_id == household_id,
        ),
    )
    await db.flush()


async def refresh_token(
    db: AsyncSession,
    raw_token: str,
) -> dict:
    token_hash = _hash_token(raw_token)
    token_record = (
        await db.execute(
            select(RefreshTokenModel).where(
                RefreshTokenModel.token_hash == token_hash,
            ),
        )
    ).scalar_one_or_none()

    if not token_record:
        msg = "Invalid refresh token"
        raise UnauthorizedException(msg)
    if token_record.expires_at.replace(tzinfo=UTC) < datetime.now(
        UTC,
    ):
        await db.delete(token_record)
        await db.flush()
        msg = "Refresh token expired"
        raise UnauthorizedException(msg)

    user = (
        await db.execute(
            select(UserModel).where(UserModel.id == token_record.user_id),
        )
    ).scalar_one_or_none()
    if not user:
        msg = "User not found"
        raise UnauthorizedException(msg)

    # Delete old token
    await db.delete(token_record)

    # Generate new tokens
    return await _build_auth_response(db, user)


async def request_password_reset(
    db: AsyncSession,
    email: str,
) -> dict:
    user = (
        await db.execute(select(UserModel).where(UserModel.email == email))
    ).scalar_one_or_none()

    result = {
        "message": "If the email exists, a reset link has been sent.",
        "reset_token": None,
    }

    if user:
        token_value = secrets.token_urlsafe(32)
        token_hash = _hash_token(token_value)
        reset_token = PasswordResetTokenModel(
            user_id=user.id,
            household_id=user.household_id,
            token=token_hash,
            expires_at=datetime.now(UTC) + timedelta(hours=1),
        )
        db.add(reset_token)
        await db.flush()

        if settings.debug:
            result["reset_token"] = token_value

    return result


async def confirm_password_reset(
    db: AsyncSession,
    token: str,
    new_password: str,
) -> None:
    token_hash = _hash_token(token)
    reset_record = (
        await db.execute(
            select(PasswordResetTokenModel).where(
                PasswordResetTokenModel.token == token_hash,
            ),
        )
    ).scalar_one_or_none()

    if not reset_record:
        msg = "Reset token not found"
        raise NotFoundException(msg)
    if reset_record.used_at is not None:
        msg = "Reset token has already been used"
        raise ValidationException(msg)
    if reset_record.expires_at.replace(tzinfo=UTC) < datetime.now(
        UTC,
    ):
        msg = "Reset token has expired"
        raise ValidationException(msg)

    user = (
        await db.execute(
            select(UserModel).where(UserModel.id == reset_record.user_id),
        )
    ).scalar_one_or_none()
    if not user:
        msg = "User not found"
        raise NotFoundException(msg)

    user.password_hash = hash_password(new_password)
    reset_record.used_at = datetime.now(UTC).replace(microsecond=0)

    # Invalidate all refresh tokens
    await db.execute(
        delete(RefreshTokenModel).where(
            RefreshTokenModel.user_id == user.id,
            RefreshTokenModel.household_id == user.household_id,
        ),
    )
    await db.flush()
