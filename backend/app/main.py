import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from alembic.config import Config
from alembic import command
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exception_handlers import app_exception_handler, global_exception_handler
from app.core.exceptions import AppException
from app.modules.auth.router import router as auth_router
from app.modules.household.router import router as household_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    alembic_cfg = Config(Path(__file__).parent.parent / "alembic.ini")
    await asyncio.to_thread(command.upgrade, alembic_cfg, "head")
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

app.include_router(auth_router)
app.include_router(household_router)


@app.get("/api/v1/health")
async def health():
    return {"success": True, "data": {"status": "ok"}, "error": None}
