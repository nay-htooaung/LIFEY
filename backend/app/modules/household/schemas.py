from datetime import datetime

from pydantic import BaseModel


class MemberOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: datetime


class InviteResponseData(BaseModel):
    token: str
    expires_at: datetime


class MessageResponseData(BaseModel):
    message: str
