from fastapi import Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedException
from app.core.security import decode_access_token
from app.shared.database import async_session_factory


async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise UnauthorizedException("Invalid authorization header")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = decode_access_token(token)
        user_id = payload.get("user_id")
        household_id = payload.get("household_id")
        if user_id is None or household_id is None:
            raise UnauthorizedException("Invalid token payload")
        return {"user_id": user_id, "household_id": household_id}
    except Exception:
        raise UnauthorizedException("Invalid or expired token")


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
