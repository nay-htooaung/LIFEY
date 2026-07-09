from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedException
from app.core.security import decode_token
from app.shared.database import async_session_factory


async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        msg = "Invalid authorization header"
        raise UnauthorizedException(msg)
    token = authorization.removeprefix("Bearer ")
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            msg = "Invalid token type"
            raise UnauthorizedException(msg)
        user_id = payload.get("user_id")
        household_id = payload.get("household_id")
        if user_id is None or household_id is None:
            msg = "Invalid token payload"
            raise UnauthorizedException(msg)
        return {"user_id": user_id, "household_id": household_id}
    except Exception:
        msg = "Invalid or expired token"
        raise UnauthorizedException(msg)


async def require_admin(current_user: dict = Depends(get_current_user)):
    return current_user


async def get_db() -> AsyncSession:
    session = async_session_factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
