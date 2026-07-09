from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base import Base, HouseholdMixin, TimestampMixin


class HouseholdModel(Base, TimestampMixin):
    __tablename__ = "households"

    name: Mapped[str] = mapped_column(String(100), nullable=False)

    # household_id is NOT needed — this IS the household table


class InviteTokenModel(Base, HouseholdMixin, TimestampMixin):
    __tablename__ = "invite_tokens"

    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
