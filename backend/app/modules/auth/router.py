from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db
from app.shared.schemas import APIResponse

from .schemas import (
    HouseholdOut,
    LoginRequest,
    LoginResponseData,
    MessageResponseData,
    RefreshResponseData,
    RegisterRequest,
    RegisterResponseData,
    ResetPasswordConfirm,
    ResetPasswordRequest,
    ResetPasswordRequestData,
    UserOut,
)
from .services import (
    confirm_password_reset,
    login,
    logout,
    refresh_token,
    register,
    request_password_reset,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _set_refresh_cookie(response: Response, refresh_token: str, expires: timedelta):
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=int(expires.total_seconds()),
        httponly=True,
        samesite="lax",
        path="/api/v1/auth",
        secure=False,
    )


def _clear_refresh_cookie(response: Response):
    response.set_cookie(
        key="refresh_token",
        value="",
        max_age=0,
        httponly=True,
        samesite="lax",
        path="/api/v1/auth",
    )


@router.post("/register")
async def register_endpoint(
    body: RegisterRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await register(db, body.name, body.email, body.password, body.invite_token)
    refresh_expires = timedelta(days=settings.refresh_token_expire_days)
    _set_refresh_cookie(response, result["refresh_token"], refresh_expires)
    return APIResponse(
        success=True,
        data=RegisterResponseData(
            user=UserOut(**result["user"]),
            household=HouseholdOut(**result["household"]),
            access_token=result["access_token"],
        ),
    )


@router.post("/login")
async def login_endpoint(
    body: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await login(db, body.email, body.password)
    refresh_expires = timedelta(days=settings.refresh_token_expire_days)
    _set_refresh_cookie(response, result["refresh_token"], refresh_expires)
    return APIResponse(
        success=True,
        data=LoginResponseData(
            user=UserOut(**result["user"]),
            household=HouseholdOut(**result["household"]),
            access_token=result["access_token"],
        ),
    )


@router.post("/logout")
async def logout_endpoint(
    response: Response,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await logout(db, current_user["user_id"], current_user["household_id"])
    _clear_refresh_cookie(response)
    return APIResponse(
        success=True,
        data=MessageResponseData(message="Logged out successfully"),
    )


@router.post("/refresh")
async def refresh_endpoint(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    refresh_token_value = request.cookies.get("refresh_token")
    if not refresh_token_value:
        return APIResponse(
            success=False,
            data=None,
            error={"code": "UNAUTHORIZED", "message": "No refresh token"},
        )

    result = await refresh_token(db, refresh_token_value)
    refresh_expires = timedelta(days=settings.refresh_token_expire_days)
    _set_refresh_cookie(response, result["refresh_token"], refresh_expires)
    return APIResponse(
        success=True,
        data=RefreshResponseData(access_token=result["access_token"]),
    )


@router.post("/reset-password/request")
async def reset_password_request_endpoint(
    body: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await request_password_reset(db, body.email)
    return APIResponse(
        success=True,
        data=ResetPasswordRequestData(
            message=result["message"],
            reset_token=result.get("reset_token"),
        ),
    )


@router.post("/reset-password/confirm")
async def reset_password_confirm_endpoint(
    body: ResetPasswordConfirm,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await confirm_password_reset(db, body.token, body.new_password)
    return APIResponse(
        success=True,
        data=MessageResponseData(message="Password updated successfully"),
    )
