from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ErrorSchema(BaseModel):
    code: str
    message: str


class APIResponse[T](BaseModel):
    success: bool
    data: T | None = None
    error: ErrorSchema | None = None


class PaginatedResponse[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int
