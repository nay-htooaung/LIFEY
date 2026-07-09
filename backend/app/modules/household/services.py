import math
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from app.modules.auth.models import RefreshTokenModel, UserModel

from .models import InviteTokenModel


async def create_invite(
    db: AsyncSession,
    household_id: int,
    current_user_id: int,
) -> dict:
    user = (
        await db.execute(
            select(UserModel).where(
                UserModel.id == current_user_id,
                UserModel.household_id == household_id,
            ),
        )
    ).scalar_one_or_none()

    if not user:
        msg = "User not found"
        raise NotFoundException(msg)
    if user.role != "admin":
        msg = "Only admins can generate invites"
        raise ForbiddenException(msg)

    token_value = secrets.token_urlsafe(48)
    expires_at = datetime.now(UTC) + timedelta(hours=24)

    invite = InviteTokenModel(
        household_id=household_id,
        token=token_value,
        expires_at=expires_at,
    )
    db.add(invite)
    await db.flush()

    return {
        "token": token_value,
        "expires_at": expires_at,
    }


async def list_members(
    db: AsyncSession,
    household_id: int,
    page: int,
    page_size: int,
) -> dict:
    count_query = select(func.count()).where(UserModel.household_id == household_id)
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    query = (
        select(UserModel)
        .where(UserModel.household_id == household_id)
        .order_by(UserModel.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    users = (await db.execute(query)).scalars().all()

    items = [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at,
        }
        for u in users
    ]

    pages = math.ceil(total / page_size) if total > 0 else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


async def remove_member(
    db: AsyncSession,
    household_id: int,
    target_user_id: int,
    current_user_id: int,
) -> None:
    current_user = (
        await db.execute(
            select(UserModel).where(
                UserModel.id == current_user_id,
                UserModel.household_id == household_id,
            ),
        )
    ).scalar_one_or_none()

    if not current_user or current_user.role != "admin":
        msg = "Only admins can remove members"
        raise ForbiddenException(msg)

    if target_user_id == current_user_id:
        msg = "Cannot remove yourself"
        raise ForbiddenException(msg)

    target = (
        await db.execute(
            select(UserModel).where(
                UserModel.id == target_user_id,
                UserModel.household_id == household_id,
            ),
        )
    ).scalar_one_or_none()

    if not target:
        msg = "Member not found"
        raise NotFoundException(msg)

    # Check if removing the last admin
    if target.role == "admin":
        admin_count = (
            await db.execute(
                select(func.count()).where(
                    UserModel.household_id == household_id,
                    UserModel.role == "admin",
                    UserModel.id != target_user_id,
                ),
            )
        ).scalar()
        if admin_count == 0:
            msg = "Cannot remove the last admin"
            raise ConflictException(msg)

    # Delete refresh tokens for the removed user
    await db.execute(
        delete(RefreshTokenModel).where(
            RefreshTokenModel.user_id == target_user_id,
            RefreshTokenModel.household_id == household_id,
        ),
    )

    # Delete the user
    await db.delete(target)
    await db.flush()
