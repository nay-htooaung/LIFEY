import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestHouseholdRouters:
    async def test_list_members(self, async_client: AsyncClient):
        # Register an admin to get a token
        reg = await async_client.post(
            "/api/v1/auth/register",
            json={"name": "Alice", "email": "alice@test.com", "password": "password123"},
        )
        token = reg.json()["data"]["access_token"]

        response = await async_client.get(
            "/api/v1/households/members",
            headers={"Authorization": f"Bearer {token}"},
        )
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        assert len(data["data"]["items"]) == 1
        assert data["data"]["items"][0]["email"] == "alice@test.com"

    async def test_list_members_empty_page(self, async_client: AsyncClient):
        reg = await async_client.post(
            "/api/v1/auth/register",
            json={"name": "Alice", "email": "alice@test.com", "password": "password123"},
        )
        token = reg.json()["data"]["access_token"]

        response = await async_client.get(
            "/api/v1/households/members?page=2&page_size=20",
            headers={"Authorization": f"Bearer {token}"},
        )
        data = response.json()
        assert data["data"]["items"] == []

    async def test_create_invite_admin(self, async_client: AsyncClient):
        reg = await async_client.post(
            "/api/v1/auth/register",
            json={"name": "Alice", "email": "alice@test.com", "password": "password123"},
        )
        token = reg.json()["data"]["access_token"]

        response = await async_client.post(
            "/api/v1/households/invites",
            headers={"Authorization": f"Bearer {token}"},
        )
        data = response.json()
        assert response.status_code == 201
        assert data["success"] is True
        assert data["data"]["token"]
        assert data["data"]["expires_at"]

    async def test_create_invite_unauthenticated(self, async_client: AsyncClient):
        response = await async_client.post("/api/v1/households/invites")
        assert response.status_code in (401, 422)

    async def test_remove_member(self, async_client: AsyncClient):
        # Register admin
        reg = await async_client.post(
            "/api/v1/auth/register",
            json={"name": "Alice", "email": "alice@test.com", "password": "password123"},
        )
        admin_token = reg.json()["data"]["access_token"]

        # Register a member via invite
        invite_resp = await async_client.post(
            "/api/v1/households/invites",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        invite_token = invite_resp.json()["data"]["token"]

        await async_client.post(
            "/api/v1/auth/register",
            json={
                "name": "Bob",
                "email": "bob@test.com",
                "password": "password123",
                "invite_token": invite_token,
            },
        )

        # Get members to find bob's id
        members_resp = await async_client.get(
            "/api/v1/households/members",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        bob = next(m for m in members_resp.json()["data"]["items"] if m["email"] == "bob@test.com")

        # Remove bob
        response = await async_client.delete(
            f"/api/v1/households/members/{bob['id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True

        # Verify bob is gone
        members_resp2 = await async_client.get(
            "/api/v1/households/members",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        emails = [m["email"] for m in members_resp2.json()["data"]["items"]]
        assert "bob@test.com" not in emails

    async def test_remove_member_unauthenticated(self, async_client: AsyncClient):
        response = await async_client.delete("/api/v1/households/members/1")
        assert response.status_code in (401, 422)
