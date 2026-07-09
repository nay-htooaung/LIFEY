from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    invite_token: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str


class HouseholdOut(BaseModel):
    id: int
    name: str


class RegisterResponseData(BaseModel):
    user: UserOut
    household: HouseholdOut
    access_token: str


class LoginResponseData(BaseModel):
    user: UserOut
    household: HouseholdOut
    access_token: str


class RefreshResponseData(BaseModel):
    access_token: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ResetPasswordRequestData(BaseModel):
    message: str
    reset_token: str | None = None


class MessageResponseData(BaseModel):
    message: str
