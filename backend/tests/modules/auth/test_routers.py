import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestAuthRouters:
    async def test_register_first_user(self, async_client: AsyncClient):
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "name": "Alice",
                "email": "alice@test.com",
                "password": "password123",
            },
        )
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        assert data["data"]["user"]["role"] == "admin"
        assert data["data"]["user"]["email"] == "alice@test.com"
        assert data["data"]["access_token"]
        assert "refresh_token" in response.cookies

    async def test_register_duplicate_email(self, async_client: AsyncClient):
        await async_client.post(
            "/api/v1/auth/register",
            json={"name": "Alice", "email": "alice@test.com", "password": "password123"},
        )
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "name": "Alice2",
                "email": "alice@test.com",
                "password": "password123",
            },
        )
        data = response.json()
        assert response.status_code == 409
        assert data["success"] is False
        assert data["error"]["code"] == "CONFLICT"

    async def test_login_valid(self, async_client: AsyncClient):
        # First register
        await async_client.post(
            "/api/v1/auth/register",
            json={"name": "Alice", "email": "alice@test.com", "password": "password123"},
        )

        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "alice@test.com", "password": "password123"},
        )
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        assert data["data"]["user"]["email"] == "alice@test.com"
        assert data["data"]["access_token"]
        assert "refresh_token" in response.cookies

    async def test_login_wrong_password(self, async_client: AsyncClient):
        await async_client.post(
            "/api/v1/auth/register",
            json={"name": "Alice", "email": "alice@test.com", "password": "password123"},
        )

        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "alice@test.com", "password": "wrongpassword"},
        )
        data = response.json()
        assert response.status_code == 401
        assert data["success"] is False
        assert data["error"]["code"] == "UNAUTHORIZED"

    async def test_logout(self, async_client: AsyncClient):
        reg = await async_client.post(
            "/api/v1/auth/register",
            json={"name": "Alice", "email": "alice@test.com", "password": "password123"},
        )
        token = reg.json()["data"]["access_token"]

        response = await async_client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        # Check cookie clearing
        set_cookie = response.headers.get("set-cookie", "")
        assert "refresh_token=;" in set_cookie or "Max-Age=0" in set_cookie

    async def test_refresh_token(self, async_client: AsyncClient):
        reg = await async_client.post(
            "/api/v1/auth/register",
            json={"name": "Alice", "email": "alice@test.com", "password": "password123"},
        )
        refresh_cookie = reg.cookies.get("refresh_token")

        response = await async_client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": refresh_cookie},
        )
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        assert data["data"]["access_token"]

    async def test_refresh_no_cookie(self, async_client: AsyncClient):
        response = await async_client.post("/api/v1/auth/refresh")
        # Should still return 200 but with error in envelope
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "UNAUTHORIZED"

    async def test_password_reset_request(
        self,
        async_client: AsyncClient,
    ):
        await async_client.post(
            "/api/v1/auth/register",
            json={"name": "Alice", "email": "alice@test.com", "password": "password123"},
        )

        response = await async_client.post(
            "/api/v1/auth/reset-password/request",
            json={"email": "alice@test.com"},
        )
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        assert data["data"]["message"]
        assert data["data"]["reset_token"] is not None

    async def test_password_reset_confirm(
        self,
        async_client: AsyncClient,
    ):
        await async_client.post(
            "/api/v1/auth/register",
            json={"name": "Alice", "email": "alice@test.com", "password": "password123"},
        )
        req = await async_client.post(
            "/api/v1/auth/reset-password/request",
            json={"email": "alice@test.com"},
        )
        reset_token = req.json()["data"]["reset_token"]

        response = await async_client.post(
            "/api/v1/auth/reset-password/confirm",
            json={"token": reset_token, "new_password": "newpassword456"},
        )
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True

        # Login with new password
        login_resp = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "alice@test.com", "password": "newpassword456"},
        )
        assert login_resp.json()["success"] is True
