from fastapi import HTTPException


class AppException(HTTPException):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(status_code=status_code, detail={"code": code, "message": message})


class NotFoundException(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(404, "NOT_FOUND", message)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(403, "FORBIDDEN", message)


class ConflictException(AppException):
    def __init__(self, message: str = "Conflict"):
        super().__init__(409, "CONFLICT", message)


class ValidationException(AppException):
    def __init__(self, message: str = "Validation error"):
        super().__init__(400, "VALIDATION_ERROR", message)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(401, "UNAUTHORIZED", message)
