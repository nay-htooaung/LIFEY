from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.shared.schemas import APIResponse, PaginatedResponse

from .schemas import InviteResponseData, MemberOut, MessageResponseData
from .services import create_invite, list_members, remove_member

router = APIRouter(prefix="/api/v1/households", tags=["household"])


@router.get("/members")
async def get_members(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await list_members(db, current_user["household_id"], page, page_size)
    return APIResponse(
        success=True,
        data=PaginatedResponse(
            items=[MemberOut(**item) for item in result["items"]],
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
            pages=result["pages"],
        ),
    )


@router.post("/invites", status_code=201)
async def create_invite_endpoint(
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await create_invite(
        db,
        current_user["household_id"],
        current_user["user_id"],
    )
    return APIResponse(
        success=True,
        data=InviteResponseData(
            token=result["token"],
            expires_at=result["expires_at"],
        ),
    )


@router.delete("/members/{user_id}")
async def remove_member_endpoint(
    user_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await remove_member(
        db,
        current_user["household_id"],
        user_id,
        current_user["user_id"],
    )
    return APIResponse(
        success=True,
        data=MessageResponseData(message="Member removed"),
    )
