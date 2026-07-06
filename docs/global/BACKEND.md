# BACKEND — Implementation Conventions

## Module Structure

```
app/
  __init__.py
  main.py               # App factory
  core/
    config.py           # pydantic-settings
    security.py         # JWT + bcrypt
    exceptions.py       # AppException hierarchy
    exception_handlers.py  # Global FastAPI handlers
    dependencies.py     # get_current_user
  shared/
    base.py             # SQLAlchemy Base, mixins
    schemas.py          # Envelope + pagination Pydantic models
    pagination.py       # PaginationParams + paginate()
  modules/
    auth/               # Feature module
    expense/
    recipe/
    todo/
    grocery/
    household/
    agent/
  migrations/           # Alembic
tests/                  # Mirrors module structure
Dockerfile
requirements.txt
pyproject.toml          # ruff + mypy config
```

## 1. App Factory (`app/main.py`)

A single `create_app()` function that:

1. Creates the FastAPI instance.
2. Configures CORS middleware from `settings.FRONTEND_URL`.
3. Registers global exception handlers.
4. Includes all feature routers under `/api/v1/`.
5. Exposes `app` for uvicorn.

```python
def create_app() -> FastAPI:
    app = FastAPI(title="LIFEY", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    app.include_router(auth_router, prefix="/api/v1/auth")
    app.include_router(expense_router, prefix="/api/v1/expenses")
    # ... other feature routers

    return app

app = create_app()
```

## 2. Core Module (`app/core/`)

### config.py

Uses `pydantic-settings` to load env vars from `.env`.

```python
class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    FRONTEND_URL: str = "http://localhost"
    OPENCODE_API_KEY: str = ""
    DEBUG: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
```

### security.py

```python
# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str: ...
def verify_password(plain: str, hashed: str) -> bool: ...

# JWT
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str: ...
def create_refresh_token(data: dict) -> str: ...
def decode_token(token: str) -> dict: ...
```

- Token payload includes `sub` (user_id), `household_id`, `exp`, `type` ("access" or "refresh").
- HS256 signing using `settings.JWT_SECRET_KEY`.

### exceptions.py

Exception hierarchy rooted at `AppException`:

| Exception | Code | HTTP Status |
|-----------|------|-------------|
| `AppException` | custom | custom |
| `NotFoundException` | `NOT_FOUND` | 404 |
| `ForbiddenException` | `FORBIDDEN` | 403 |
| `ConflictException` | `CONFLICT` | 409 |
| `UnauthorizedException` | `UNAUTHORIZED` | 401 |
| `ValidationException` | `VALIDATION_ERROR` | 422 |

```python
class AppException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
```

### exception_handlers.py

Two handlers:

1. `@app.exception_handler(AppException)` — returns envelope with exception's `status_code`, `code`, `message`.
2. `@app.exception_handler(Exception)` — logs traceback server-side, returns 500 `INTERNAL_ERROR`. Never exposes internals.

### dependencies.py

```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserContext:
    payload = decode_token(token)
    # Verify type == "access"
    # Optionally re-fetch user from DB
    return UserContext(user_id=payload["sub"], household_id=payload["household_id"])
```

## 3. Shared Module (`app/shared/`)

### base.py

```python
class TimestampMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

class HouseholdMixin:
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"), nullable=False)

class Base(DeclarativeBase):
    pass
```

Feature models: `class ExpenseModel(Base, TimestampMixin, HouseholdMixin)`

### schemas.py

```python
class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T | None = None
    error: None = None

class ErrorSchema(BaseModel):
    code: str
    message: str

class APIErrorResponse(BaseModel):
    success: bool = False
    data: None = None
    error: ErrorSchema

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int  # math.ceil(total / page_size)
```

### pagination.py

```python
class PaginationParams(BaseModel):
    page: int = Query(1, ge=1)
    page_size: int = Query(20, ge=1, le=100)

async def paginate(query: Select, db: AsyncSession, params: PaginationParams) -> PaginatedResponse:
    offset = (params.page - 1) * params.page_size
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    items = (await db.execute(query.offset(offset).limit(params.page_size))).scalars().all()
    pages = math.ceil(total / params.page_size)
    return PaginatedResponse(items=items, total=total, page=params.page, page_size=params.page_size, pages=pages)
```

## 4. Dockerfile

Multi-stage build:

```dockerfile
# Stage 1: install deps
FROM python:3.13-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: runtime
FROM python:3.13-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 5. Linting & Type Checking (`pyproject.toml`)

```toml
[tool.ruff]
line-length = 100
target-version = "py313"

[tool.ruff.lint]
select = ["ALL"]

[tool.ruff.format]
quote-style = "double"

[tool.mypy]
strict = true
```
