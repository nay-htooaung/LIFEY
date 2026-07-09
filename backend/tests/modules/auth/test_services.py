from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictException,
    NotFoundException,
    UnauthorizedException,
    ValidationException,
)
from app.modules.auth.models import (
    PasswordResetTokenModel,
    RefreshTokenModel,
    UserModel,
)
from app.modules.auth.services import (
    confirm_password_reset,
    login,
    logout,
    refresh_token,
    register,
    request_password_reset,
)
from app.modules.household.models import HouseholdModel, InviteTokenModel
from tests.factories import (
    create_household,
    create_invite_token,
    create_password_reset_token,
    create_refresh_token,
    create_user,
)


class TestRegister:
    async def test_register_first_user_creates_household_and_admin(
        self,
        db_session: AsyncSession,
    ):
        result = await register(
            db_session,
            name="Alice",
            email="alice@test.com",
            password="password123",
        )

        assert result["user"]["role"] == "admin"
        assert result["user"]["email"] == "alice@test.com"
        assert result["user"]["name"] == "Alice"
        assert result["household"]["name"] == "Alice's Household"
        assert result["access_token"]
        assert result["refresh_token"]

        user = (
            await db_session.execute(
                select(UserModel).where(UserModel.email == "alice@test.com"),
            )
        ).scalar_one()
        assert user.role == "admin"

        household = (
            await db_session.execute(
                select(HouseholdModel).where(HouseholdModel.id == user.household_id),
            )
        ).scalar_one()
        assert household.name == "Alice's Household"

        rt = (
            (
                await db_session.execute(
                    select(RefreshTokenModel).where(
                        RefreshTokenModel.user_id == user.id,
                    ),
                )
            )
            .scalars()
            .all()
        )
        assert len(rt) == 1

    async def test_register_with_valid_invite_token_joins_household(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session, name="HH-A")
        invite, raw_token = await create_invite_token(
            db_session,
            household_id=household.id,
        )

        result = await register(
            db_session,
            name="Bob",
            email="bob@test.com",
            password="password123",
            invite_token=raw_token,
        )

        assert result["user"]["role"] == "member"
        assert result["household"]["id"] == household.id

        updated_invite = (
            await db_session.execute(
                select(InviteTokenModel).where(InviteTokenModel.id == invite.id),
            )
        ).scalar_one()
        assert updated_invite.used_at is not None

    async def test_register_duplicate_email_returns_409(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        await create_user(
            db_session,
            household_id=household.id,
            email="alice@test.com",
        )

        with pytest.raises(ConflictException, match="Email already registered"):
            await register(
                db_session,
                name="Alice2",
                email="alice@test.com",
                password="password123",
            )

    async def test_register_expired_invite_returns_400(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        _, raw_token = await create_invite_token(
            db_session,
            household_id=household.id,
            expires_at=datetime.now(UTC) - timedelta(hours=1),
        )

        with pytest.raises(ValidationException, match="expired"):
            await register(
                db_session,
                name="Bob",
                email="bob@test.com",
                password="password123",
                invite_token=raw_token,
            )

    async def test_register_used_invite_returns_400(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        _, raw_token = await create_invite_token(
            db_session,
            household_id=household.id,
            used_at=datetime.now(UTC),
        )

        with pytest.raises(ValidationException, match="used"):
            await register(
                db_session,
                name="Bob",
                email="bob@test.com",
                password="password123",
                invite_token=raw_token,
            )

    async def test_register_nonexistent_invite_returns_400(
        self,
        db_session: AsyncSession,
    ):
        with pytest.raises(ValidationException, match="Invalid"):
            await register(
                db_session,
                name="Bob",
                email="bob@test.com",
                password="password123",
                invite_token="NONEXISTENT",
            )

    async def test_register_email_already_in_household_returns_login(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        user = await create_user(
            db_session,
            household_id=household.id,
            email="bob@test.com",
            role="member",
        )
        _, raw_token = await create_invite_token(
            db_session,
            household_id=household.id,
        )

        result = await register(
            db_session,
            name="Bob",
            email="bob@test.com",
            password="password123",
            invite_token=raw_token,
        )

        assert result["user"]["id"] == user.id
        users = (
            (
                await db_session.execute(
                    select(UserModel).where(UserModel.email == "bob@test.com"),
                )
            )
            .scalars()
            .all()
        )
        assert len(users) == 1


class TestLoginLogout:
    async def test_login_valid_credentials(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        user = await create_user(
            db_session,
            household_id=household.id,
            email="alice@test.com",
            password="password123",
            role="admin",
        )

        result = await login(db_session, "alice@test.com", "password123")

        assert result["user"]["id"] == user.id
        assert result["user"]["email"] == "alice@test.com"
        assert result["access_token"]

    async def test_login_wrong_password_returns_401(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        await create_user(
            db_session,
            household_id=household.id,
            email="alice@test.com",
            password="password123",
        )

        with pytest.raises(UnauthorizedException, match="Invalid email or password"):
            await login(db_session, "alice@test.com", "wrongpassword")

    async def test_login_nonexistent_email_returns_401(
        self,
        db_session: AsyncSession,
    ):
        with pytest.raises(UnauthorizedException, match="Invalid email or password"):
            await login(db_session, "nobody@test.com", "anything")

    async def test_login_rotates_refresh_token(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        user = await create_user(
            db_session,
            household_id=household.id,
            email="alice@test.com",
            password="password123",
        )

        old_rt, old_token = await create_refresh_token(
            db_session,
            user_id=user.id,
            household_id=household.id,
        )

        result = await login(db_session, "alice@test.com", "password123")

        rts = (
            (
                await db_session.execute(
                    select(RefreshTokenModel).where(
                        RefreshTokenModel.user_id == user.id,
                    ),
                )
            )
            .scalars()
            .all()
        )
        assert len(rts) == 1
        assert rts[0].token_hash != old_rt.token_hash
        assert result["refresh_token"] != old_token

    async def test_logout_clears_tokens(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        user = await create_user(
            db_session,
            household_id=household.id,
            email="alice@test.com",
            password="password123",
        )
        await create_refresh_token(
            db_session,
            user_id=user.id,
            household_id=household.id,
        )

        await logout(db_session, user.id, household.id)

        rts = (
            (
                await db_session.execute(
                    select(RefreshTokenModel).where(
                        RefreshTokenModel.user_id == user.id,
                    ),
                )
            )
            .scalars()
            .all()
        )
        assert len(rts) == 0


class TestRefreshToken:
    async def test_refresh_valid_token(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        user = await create_user(
            db_session,
            household_id=household.id,
            email="alice@test.com",
        )
        _rt, raw = await create_refresh_token(
            db_session,
            user_id=user.id,
            household_id=household.id,
        )

        result = await refresh_token(db_session, raw)

        assert result["access_token"]
        assert result["refresh_token"] != raw

        new_rts = (
            (
                await db_session.execute(
                    select(RefreshTokenModel).where(
                        RefreshTokenModel.user_id == user.id,
                    ),
                )
            )
            .scalars()
            .all()
        )
        assert len(new_rts) == 1

    async def test_refresh_expired_token_returns_401(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        user = await create_user(
            db_session,
            household_id=household.id,
            email="alice@test.com",
        )
        _, raw = await create_refresh_token(
            db_session,
            user_id=user.id,
            household_id=household.id,
            expires_at=datetime.now(UTC) - timedelta(hours=1),
        )

        with pytest.raises(UnauthorizedException, match="expired"):
            await refresh_token(db_session, raw)

    async def test_refresh_rotated_token_returns_401(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        user = await create_user(
            db_session,
            household_id=household.id,
            email="alice@test.com",
        )
        _, raw = await create_refresh_token(
            db_session,
            user_id=user.id,
            household_id=household.id,
        )
        # Rotate: login again creates a new token and deletes the old one
        await login(db_session, "alice@test.com", "password123")

        with pytest.raises(UnauthorizedException, match="Invalid"):
            await refresh_token(db_session, raw)

    async def test_refresh_no_token_returns_401(
        self,
        db_session: AsyncSession,
    ):
        with pytest.raises(UnauthorizedException, match="Invalid"):
            await refresh_token(db_session, "nonexistent")


class TestPasswordReset:
    async def test_reset_request_existing_email(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        user = await create_user(
            db_session,
            household_id=household.id,
            email="alice@test.com",
        )

        result = await request_password_reset(db_session, "alice@test.com")

        assert result["message"]
        assert result["reset_token"] is not None

        tokens = (
            (
                await db_session.execute(
                    select(PasswordResetTokenModel).where(
                        PasswordResetTokenModel.user_id == user.id,
                    ),
                )
            )
            .scalars()
            .all()
        )
        assert len(tokens) == 1

    async def test_reset_request_nonexistent_email(
        self,
        db_session: AsyncSession,
    ):
        result = await request_password_reset(db_session, "nobody@test.com")

        assert result["message"]
        assert result["reset_token"] is None

        tokens = (await db_session.execute(select(PasswordResetTokenModel))).scalars().all()
        assert len(tokens) == 0

    async def test_reset_confirm_valid_token(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        user = await create_user(
            db_session,
            household_id=household.id,
            email="alice@test.com",
            password="password123",
        )
        _, raw = await create_password_reset_token(
            db_session,
            user_id=user.id,
            household_id=household.id,
        )

        # Create a refresh token to verify it gets cleaned up
        await create_refresh_token(
            db_session,
            user_id=user.id,
            household_id=household.id,
        )

        await confirm_password_reset(db_session, raw, "newpassword456")

        # Refresh tokens should be invalidated after password reset
        rts = (
            (
                await db_session.execute(
                    select(RefreshTokenModel).where(
                        RefreshTokenModel.user_id == user.id,
                    ),
                )
            )
            .scalars()
            .all()
        )
        assert len(rts) == 0

        # Verify new password works
        result = await login(db_session, "alice@test.com", "newpassword456")
        assert result["access_token"]

        # Old password no longer works
        with pytest.raises(UnauthorizedException):
            await login(db_session, "alice@test.com", "password123")

    async def test_reset_confirm_expired_token(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        await create_user(
            db_session,
            household_id=household.id,
            email="alice@test.com",
        )
        _, raw = await create_password_reset_token(
            db_session,
            user_id=1,
            household_id=household.id,
            expires_at=datetime.now(UTC) - timedelta(hours=2),
        )

        with pytest.raises(ValidationException, match="expired"):
            await confirm_password_reset(db_session, raw, "newpassword456")

    async def test_reset_confirm_used_token(
        self,
        db_session: AsyncSession,
    ):
        household = await create_household(db_session)
        await create_user(
            db_session,
            household_id=household.id,
            email="alice@test.com",
        )
        _, raw = await create_password_reset_token(
            db_session,
            user_id=1,
            household_id=household.id,
            used_at=datetime.now(UTC),
        )

        with pytest.raises(ValidationException, match="used"):
            await confirm_password_reset(db_session, raw, "newpassword456")

    async def test_reset_confirm_invalid_token(
        self,
        db_session: AsyncSession,
    ):
        with pytest.raises(NotFoundException, match="not found"):
            await confirm_password_reset(db_session, "INVALID", "newpassword456")
