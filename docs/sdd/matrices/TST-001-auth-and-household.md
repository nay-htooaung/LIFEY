# TST-001: Auth & Household — Test Matrix

**Linked to:** `DSN-001` | **Spec:** `SPEC-001`

## 1. Test Case Overview

| TC ID | Use Case | Area | Type | Description |
|-------|----------|------|------|-------------|
| TC-001 | SPEC-001:US-001 | Backend | Integration | First user registration creates household + admin role |
| TC-002 | SPEC-001:US-005 | Backend | Integration | Registration with valid invite token joins household as member |
| TC-003 | SPEC-001:US-001 | Backend | Integration | Duplicate email returns 409 CONFLICT |
| TC-004 | SPEC-001:US-005 | Backend | Integration | Registration with expired invite token returns 400 |
| TC-005 | SPEC-001:US-005 | Backend | Integration | Registration with already-used invite token returns 400 |
| TC-006 | SPEC-001:US-005 | Backend | Integration | Registration with non-existent invite token returns 400 |
| TC-007 | SPEC-001:US-005 | Backend | Integration | Registration with email already in target household returns 200 (login redirect) |
| TC-008 | SPEC-001:US-001 | Backend | Unit | Pydantic validation rejects bad input (short password, long name, bad email) |
| TC-009 | SPEC-001:US-002 | Backend | Integration | Login with valid credentials returns user + household + tokens |
| TC-010 | SPEC-001:US-002 | Backend | Integration | Login with wrong password returns 401 |
| TC-011 | SPEC-001:US-002 | Backend | Integration | Login with non-existent email returns 401 (no enumeration) |
| TC-012 | SPEC-001:US-002 | Backend | Integration | Login rotates old refresh token (old token invalidated) |
| TC-013 | SPEC-001:US-002 | Backend | Integration | Logout clears cookie and deletes refresh tokens from DB |
| TC-014 | SPEC-001:US-002 | Backend | Integration | Logout without auth header returns 401 |
| TC-015 | SPEC-001:US-003 | Backend | Integration | Refresh with valid cookie returns new access token |
| TC-016 | SPEC-001:US-003 | Backend | Integration | Refresh with expired refresh token returns 401 |
| TC-017 | SPEC-001:US-003 | Backend | Integration | Refresh with rotated (old) refresh token returns 401 |
| TC-018 | SPEC-001:US-003 | Backend | Integration | Refresh without cookie returns 401 |
| TC-019 | SPEC-001:US-007 | Backend | Integration | Password reset request for existing email returns success (dev: includes token) |
| TC-020 | SPEC-001:US-007 | Backend | Integration | Password reset request for non-existent email returns generic success |
| TC-021 | SPEC-001:US-007 | Backend | Integration | Password reset confirm with valid token updates password |
| TC-022 | SPEC-001:US-007 | Backend | Integration | Password reset confirm with expired token returns 400 |
| TC-023 | SPEC-001:US-007 | Backend | Integration | Password reset confirm with used token returns 400 |
| TC-024 | SPEC-001:US-007 | Backend | Integration | Password reset confirm with invalid token returns 404 |
| TC-025 | SPEC-001:US-007 | Backend | Integration | Login with new password after successful reset |
| TC-026 | SPEC-001:US-004 | Backend | Integration | Admin generates invite token with 24h expiry |
| TC-027 | SPEC-001:US-004 | Backend | Integration | Non-admin member generates invite returns 403 |
| TC-028 | SPEC-001:US-004 | Backend | Integration | Unauthenticated request to generate invite returns 401 |
| TC-029 | SPEC-001:US-006 | Backend | Integration | List members returns paginated results sorted by created_at DESC |
| TC-030 | SPEC-001:US-006 | Backend | Integration | List members with empty page returns empty items array |
| TC-031 | SPEC-001:US-006 | Backend | Integration | List members enforces pagination boundaries (page=0, page_size=101) |
| TC-032 | SPEC-001:US-006 | Backend | Integration | Admin removes member — user deleted, refresh tokens revoked |
| TC-033 | SPEC-001:US-006 | Backend | Integration | Non-admin removes member returns 403 |
| TC-034 | SPEC-001:US-006 | Backend | Integration | Admin removes self returns 403 (CANNOT_REMOVE_SELF) |
| TC-035 | SPEC-001:US-006 | Backend | Integration | Admin removes last other admin returns 409 (LAST_ADMIN) |
| TC-036 | SPEC-001:US-006 | Backend | Integration | Remove non-existent user from household returns 404 |
| TC-037 | SPEC-001:US-006 | Backend | Integration | Remove user from wrong household returns 404 |
| TC-038 | SPEC-001:US-005 | Backend | Integration | Cross-household: invite token from HH-A cannot be used to join HH-B |
| TC-039 | SPEC-001:US-006 | Backend | Integration | Cross-household: admin from HH-A cannot list HH-B's members |
| TC-040 | SPEC-001:US-006 | Backend | Integration | Cross-household: admin from HH-A cannot remove HH-B's member |
| TC-041 | SPEC-001:US-006 | Backend | Integration | Removed member's refresh tokens are deleted (cannot refresh) |
| TC-042 | SPEC-001:US-002 | Frontend | Component | LoginPage renders form and submits credentials |
| TC-043 | SPEC-001:US-002 | Frontend | Component | LoginPage shows Zod validation errors on empty/invalid fields |
| TC-044 | SPEC-001:US-002 | Frontend | Component | LoginPage displays API error message on failed login |
| TC-045 | SPEC-001:US-001 | Frontend | Component | RegisterPage creates first user (no invite token) |
| TC-046 | SPEC-001:US-005 | Frontend | Component | RegisterPage pre-fills invite token from URL query param |
| TC-047 | SPEC-001:US-001 | Frontend | Component | RegisterPage shows Zod validation errors |
| TC-048 | SPEC-001:US-002 | Frontend | Component | Logout clears in-memory token and redirects to /login |
| TC-049 | SPEC-001:US-003 | Frontend | Hook | Token refresh interceptor: 401 → refresh succeeds → retry original request |
| TC-050 | SPEC-001:US-003 | Frontend | Hook | Token refresh interceptor: 401 → refresh fails → redirect to /login |
| TC-051 | SPEC-001:US-006 | Frontend | Component | MembersPage renders member list with role badges |
| TC-052 | SPEC-001:US-006 | Frontend | Component | MembersPage pagination controls navigate pages |
| TC-053 | SPEC-001:US-006 | Frontend | Component | MembersPage admin can remove a member (confirmation + API call) |
| TC-054 | SPEC-001:US-006 | Frontend | Component | MembersPage non-admin cannot see remove button |
| TC-055 | SPEC-001:US-004 | Frontend | Component | InvitePage generates and displays token with copy button |
| TC-056 | SPEC-001:US-004 | Frontend | Component | InvitePage non-admin sees forbidden message |
| TC-057 | SPEC-001:US-007 | Frontend | Component | RequestResetPage submits email and shows success message |
| TC-058 | SPEC-001:US-007 | Frontend | Component | ResetPasswordPage submits token + new password |
| TC-059 | — | Frontend | Component | ProtectedRoute redirects to /login when unauthenticated |
| TC-060 | — | Frontend | Component | AdminRoute shows forbidden state for non-admin user |

## 2. Backend Test Cases

Test files: `tests/modules/auth/test_services.py`, `tests/modules/auth/test_routers.py`, `tests/modules/household/test_services.py`, `tests/modules/household/test_routers.py`.

**Framework:** pytest + pytest-asyncio.
**Database:** Test PostgreSQL (Docker Compose or testcontainers). Each test wraps in a transaction rollback.
**Factories:** factory_boy fixtures for `UserModel`, `HouseholdModel`, `InviteTokenModel`, `RefreshTokenModel`, `PasswordResetTokenModel`.
**Auth helper:** `create_test_token(user_id, household_id, type="access")` to generate JWTs for authenticated requests.
**Envelope assertion pattern:** Every endpoint response must assert `response.json()["success"]` is `True`/`False` and the `data`/`error` shapes match the design.

---

### Registration (US-001, US-005)

#### TC-001: First user registration creates household + admin role
- **Type:** Integration
- **Given:** No user exists with email `alice@test.com`
- **When:** `POST /api/v1/auth/register` with `{ "name": "Alice", "email": "alice@test.com", "password": "password123" }`
- **Then:** Response 200. `success` is `true`. `data.user.role` is `"admin"`. `data.household.name` is `"Alice's Household"`. `data.access_token` is a non-empty string. A `Set-Cookie` header contains `refresh_token` with `HttpOnly` and `Max-Age=2592000`. A `HouseholdModel` and `UserModel` exist in DB.
- **Mock:** None (real DB).

#### TC-002: Registration with valid invite token joins household as member
- **Type:** Integration
- **Given:** A household `HH-A` exists with admin user. An `InviteTokenModel` exists with `token=X`, `household_id=HH-A.id`, `expires_at > now()`, `used_at=None`.
- **When:** `POST /api/v1/auth/register` with `{ "name": "Bob", "email": "bob@test.com", "password": "password123", "invite_token": "X" }`
- **Then:** Response 200. `data.user.role` is `"member"`. `data.household.id` equals `HH-A.id`. Invite token's `used_at` is set. `UserModel` with `household_id=HH-A.id` exists.
- **Mock:** None.

#### TC-003: Duplicate email returns 409
- **Type:** Integration
- **Given:** User with email `alice@test.com` already exists.
- **When:** `POST /api/v1/auth/register` with `{ "name": "Alice2", "email": "alice@test.com", "password": "password123" }`
- **Then:** Response 409. `success` is `false`. `error.code` is `"CONFLICT"`.
- **Mock:** None.

#### TC-004: Expired invite token returns 400
- **Type:** Integration
- **Given:** `InviteTokenModel` with `token=X`, `expires_at` in the past, `used_at=None`.
- **When:** `POST /api/v1/auth/register` with `{ "name": "Bob", "email": "bob@test.com", "password": "password123", "invite_token": "X" }`
- **Then:** Response 400. `error.code` is `"VALIDATION_ERROR"`. Error message contains "expired".
- **Mock:** None.

#### TC-005: Already-used invite token returns 400
- **Type:** Integration
- **Given:** `InviteTokenModel` with `token=X`, `expires_at > now()`, `used_at` set to a past datetime.
- **When:** `POST /api/v1/auth/register` with `{ "name": "Bob", "email": "bob@test.com", "password": "password123", "invite_token": "X" }`
- **Then:** Response 400. `error.code` is `"VALIDATION_ERROR"`. Error message contains "used".
- **Mock:** None.

#### TC-006: Non-existent invite token returns 400
- **Type:** Integration
- **Given:** No invite token with value `"NONEXISTENT"` exists.
- **When:** `POST /api/v1/auth/register` with `{ "name": "Bob", "email": "bob@test.com", "password": "password123", "invite_token": "NONEXISTENT" }`
- **Then:** Response 400. `error.code` is `"VALIDATION_ERROR"`. Error message contains "invalid".
- **Mock:** None.

#### TC-007: Email already in target household returns 200 (login redirect)
- **Type:** Integration
- **Given:** `InviteTokenModel` for `HH-A`. User `bob@test.com` already exists as a member of `HH-A`.
- **When:** `POST /api/v1/auth/register` with `{ "name": "Bob", "email": "bob@test.com", "password": "password123", "invite_token": "X" }`
- **Then:** Response 200. `data.user.id` matches the existing user. No duplicate user created. Invite token is NOT consumed.
- **Mock:** None.

#### TC-008: Pydantic validation rejects bad input
- **Type:** Unit
- **Given:** Various malformed payloads.
- **When:** `RegisterRequest` model is instantiated with each payload.
- **Then:** Assert validation errors for: (1) empty name, (2) name > 100 chars, (3) email without `@`, (4) empty email, (5) password of 7 chars, (6) password of 0 chars, (7) `invite_token` where it's empty string (not null).
- **Mock:** None (pure Pydantic).

---

### Login / Logout (US-002)

#### TC-009: Login with valid credentials returns user + household + tokens
- **Type:** Integration
- **Given:** User `alice@test.com` exists with password `password123` in `HH-A`.
- **When:** `POST /api/v1/auth/login` with `{ "email": "alice@test.com", "password": "password123" }`
- **Then:** Response 200. `data.user.id` matches the user. `data.household.id` matches `HH-A.id`. `data.access_token` is a non-empty JWT. `Set-Cookie` contains `refresh_token` with `HttpOnly`. A `RefreshTokenModel` exists in DB with `user_id` matching the user.
- **Mock:** None.

#### TC-010: Login with wrong password returns 401
- **Type:** Integration
- **Given:** User `alice@test.com` exists with password `password123`.
- **When:** `POST /api/v1/auth/login` with `{ "email": "alice@test.com", "password": "wrongpassword" }`
- **Then:** Response 401. `error.code` is `"UNAUTHORIZED"`. Error message does NOT reveal which field is wrong (generic "Invalid email or password").
- **Mock:** None.

#### TC-011: Login with non-existent email returns 401 (no enumeration)
- **Type:** Integration
- **Given:** No user exists with email `nobody@test.com`.
- **When:** `POST /api/v1/auth/login` with `{ "email": "nobody@test.com", "password": "anything" }`
- **Then:** Response 401. `error.code` is `"UNAUTHORIZED"`. Error message is identical in wording to TC-010.
- **Mock:** None.

#### TC-012: Login rotates old refresh token
- **Type:** Integration
- **Given:** User already has one `RefreshTokenModel` with `token_hash=OLD_HASH`.
- **When:** User logs in again.
- **Then:** The old `RefreshTokenModel` is deleted from DB. A new `RefreshTokenModel` with a different hash exists. The old refresh token cookie value no longer works at `/auth/refresh`.
- **Mock:** None.

#### TC-013: Logout clears cookie and deletes tokens
- **Type:** Integration
- **Given:** Authenticated user with valid access token. `RefreshTokenModel` exists for this user.
- **When:** `POST /api/v1/auth/logout` with `Authorization: Bearer <access_token>`
- **Then:** Response 200. `Set-Cookie` header contains `refresh_token=; Max-Age=0`. No `RefreshTokenModel` exists in DB for this user.
- **Mock:** None.

#### TC-014: Logout without auth returns 401
- **Type:** Integration
- **Given:** No Authorization header.
- **When:** `POST /api/v1/auth/logout`
- **Then:** Response 401. `error.code` is `"UNAUTHORIZED"`.
- **Mock:** None.

---

### Token Refresh (US-003)

#### TC-015: Refresh with valid cookie returns new access token
- **Type:** Integration
- **Given:** User has a valid `RefreshTokenModel`. Cookie `refresh_token` is set with the raw token value.
- **When:** `POST /api/v1/auth/refresh` with Cookie header containing `refresh_token=<raw_value>`.
- **Then:** Response 200. `data.access_token` is a non-empty JWT. Old refresh token is deleted. New `RefreshTokenModel` exists. New cookie is set.
- **Mock:** None. Use the cookie value returned from login TC-009.

#### TC-016: Refresh with expired refresh token returns 401
- **Type:** Integration
- **Given:** `RefreshTokenModel` with `expires_at < now()`.
- **When:** `POST /api/v1/auth/refresh` with Cookie containing the raw token.
- **Then:** Response 401. `error.code` is `"UNAUTHORIZED"`.
- **Mock:** Manually set `expires_at` to past datetime in DB fixture.

#### TC-017: Refresh with rotated (old) refresh token returns 401
- **Type:** Integration
- **Given:** User logged in, then logged in again (rotation). The old refresh token is deleted from DB.
- **When:** `POST /api/v1/auth/refresh` with the old raw token value.
- **Then:** Response 401. `error.code` is `"UNAUTHORIZED"`.
- **Mock:** Capture the old cookie value before the second login.

#### TC-018: Refresh without cookie returns 401
- **Type:** Integration
- **Given:** No Cookie header.
- **When:** `POST /api/v1/auth/refresh`
- **Then:** Response 401. `error.code` is `"UNAUTHORIZED"`.
- **Mock:** None.

---

### Password Reset (US-007)

#### TC-019: Reset request for existing email returns success (dev: includes token)
- **Type:** Integration
- **Given:** User `alice@test.com` exists. `DEBUG=True`.
- **When:** `POST /api/v1/auth/reset-password/request` with `{ "email": "alice@test.com" }`
- **Then:** Response 200. `data.message` is a success string. `data.reset_token` is a non-empty string (dev mode). A `PasswordResetTokenModel` exists in DB with `user_id` matching the user and `expires_at` ~1 hour from now.
- **Mock:** Set `settings.DEBUG = True` via monkeypatch.

#### TC-020: Reset request for non-existent email returns generic success (no enumeration)
- **Type:** Integration
- **Given:** No user exists with email `nobody@test.com`.
- **When:** `POST /api/v1/auth/reset-password/request` with `{ "email": "nobody@test.com" }`
- **Then:** Response 200. `data.message` is a success string (same wording as TC-019). `data.reset_token` is `null`. No `PasswordResetTokenModel` is created.
- **Mock:** None.

#### TC-021: Reset confirm with valid token updates password
- **Type:** Integration
- **Given:** `PasswordResetTokenModel` exists for `alice@test.com` with raw token `X`, `expires_at > now()`, `used_at=None`.
- **When:** `POST /api/v1/auth/reset-password/confirm` with `{ "token": "X", "new_password": "newpassword456" }`
- **Then:** Response 200. Token's `used_at` is set. User's password hash now verifies against `"newpassword456"` and does NOT verify against old `"password123"`. All `RefreshTokenModel` entries for this user are deleted.
- **Mock:** None.

#### TC-022: Reset confirm with expired token returns 400
- **Type:** Integration
- **Given:** `PasswordResetTokenModel` with `expires_at < now()`.
- **When:** `POST /api/v1/auth/reset-password/confirm` with valid token value.
- **Then:** Response 400. `error.code` is `"VALIDATION_ERROR"`. Error message contains "expired".
- **Mock:** Manually set `expires_at` to past datetime.

#### TC-023: Reset confirm with used token returns 400
- **Type:** Integration
- **Given:** `PasswordResetTokenModel` with `used_at` set to a past datetime.
- **When:** `POST /api/v1/auth/reset-password/confirm` with valid token value.
- **Then:** Response 400. `error.code` is `"VALIDATION_ERROR"`. Error message contains "used".
- **Mock:** None.

#### TC-024: Reset confirm with invalid token returns 404
- **Type:** Integration
- **Given:** No `PasswordResetTokenModel` with token value `"INVALID"` exists.
- **When:** `POST /api/v1/auth/reset-password/confirm` with `{ "token": "INVALID", "new_password": "newpassword456" }`
- **Then:** Response 404. `error.code` is `"NOT_FOUND"`.
- **Mock:** None.

#### TC-025: Login with new password after successful reset
- **Type:** Integration
- **Given:** Password was reset in TC-021.
- **When:** `POST /api/v1/auth/login` with `{ "email": "alice@test.com", "password": "newpassword456" }`
- **Then:** Response 200 with valid tokens.
- **When:** `POST /api/v1/auth/login` with old password `"password123"`
- **Then:** Response 401.
- **Mock:** None.

---

### Invite Generation (US-004)

#### TC-026: Admin generates invite token with 24h expiry
- **Type:** Integration
- **Given:** Authenticated admin user in `HH-A`.
- **When:** `POST /api/v1/households/invites`
- **Then:** Response 201. `data.token` is a non-empty string (~64 chars, URL-safe). `data.expires_at` is approximately `now() + 24 hours` (±1 minute). An `InviteTokenModel` exists in DB with `household_id=HH-A.id`, `used_at=None`.
- **Mock:** Freeze time with `freezegun` or similar.

#### TC-027: Non-admin member generates invite returns 403
- **Type:** Integration
- **Given:** Authenticated user with `role="member"` in `HH-A`.
- **When:** `POST /api/v1/households/invites`
- **Then:** Response 403. `error.code` is `"FORBIDDEN"`.
- **Mock:** None.

#### TC-028: Unauthenticated request to generate invite returns 401
- **Type:** Integration
- **Given:** No Authorization header.
- **When:** `POST /api/v1/households/invites`
- **Then:** Response 401. `error.code` is `"UNAUTHORIZED"`.
- **Mock:** None.

---

### Member Management (US-006)

#### TC-029: List members returns paginated results sorted by created_at DESC
- **Type:** Integration
- **Given:** `HH-A` has 3 members: Alice (admin, oldest), Bob (member), Charlie (member, newest).
- **When:** `GET /api/v1/households/members?page=1&page_size=20` as admin of `HH-A`.
- **Then:** Response 200. `data.items` is an array of 3 members. Order: Charlie, Bob, Alice (newest first). `data.total` is 3. `data.page` is 1. `data.page_size` is 20. `data.pages` is 1. Each item has `id`, `name`, `email`, `role`, `created_at`.
- **Mock:** None.

#### TC-030: List members with empty page (beyond total) returns empty items
- **Type:** Integration
- **Given:** `HH-A` has 1 member.
- **When:** `GET /api/v1/households/members?page=2&page_size=20`
- **Then:** Response 200. `data.items` is `[]`. `data.total` is 1. `data.page` is 2. `data.pages` is 1.
- **Mock:** None.

#### TC-031: List members enforces pagination boundaries
- **Type:** Integration
- **Given:** Authenticated admin.
- **When:** `GET /api/v1/households/members?page=0` (invalid)
- **Then:** Response 422.
- **When:** `GET /api/v1/households/members?page_size=101` (exceeds max of 100)
- **Then:** Response 422.
- **When:** `GET /api/v1/households/members?page=-1` (negative)
- **Then:** Response 422.
- **Mock:** None.

#### TC-032: Admin removes member — user deleted, refresh tokens revoked
- **Type:** Integration
- **Given:** `HH-A` has 2 admins (Alice, David) and 1 member (Bob). Bob has one `RefreshTokenModel`.
- **When:** `DELETE /api/v1/households/members/{bob.id}` as Alice.
- **Then:** Response 200. `UserModel` with `id=bob.id` is deleted. No `RefreshTokenModel` exists with `user_id=bob.id`. Bob cannot log in.
- **Mock:** None.

#### TC-033: Non-admin removes member returns 403
- **Type:** Integration
- **Given:** Authenticated user with `role="member"`.
- **When:** `DELETE /api/v1/households/members/{other_user_id}`
- **Then:** Response 403. `error.code` is `"FORBIDDEN"`.
- **Mock:** None.

#### TC-034: Admin removes self returns 403
- **Type:** Integration
- **Given:** Authenticated admin Alice in `HH-A`.
- **When:** `DELETE /api/v1/households/members/{alice.id}`
- **Then:** Response 403. `error.code` is `"FORBIDDEN"`. Error message contains "self".
- **Mock:** None.

#### TC-035: Admin removes last other admin returns 409
- **Type:** Integration
- **Given:** `HH-A` has exactly 1 admin (Alice) and 1 member (Bob).
- **When:** `DELETE /api/v1/households/members/{bob.id}` as Alice (bob is member, not admin)
- **Then:** Response 200 (member removal OK).
- **Given:** `HH-A` has exactly 2 admins (Alice, David) and no other members.
- **When:** `DELETE /api/v1/households/members/{david.id}` as Alice
- **Then:** Response 409. `error.code` is `"CONFLICT"`. Error message contains "last admin".
- **Mock:** None.

#### TC-036: Remove non-existent user from household returns 404
- **Type:** Integration
- **Given:** Authenticated admin in `HH-A`. No user with ID 99999 exists in `HH-A`.
- **When:** `DELETE /api/v1/households/members/99999`
- **Then:** Response 404. `error.code` is `"NOT_FOUND"`.
- **Mock:** None.

#### TC-037: Remove user from wrong household returns 404
- **Type:** Integration
- **Given:** Admin Alice in `HH-A`. User Bob in `HH-B`.
- **When:** `DELETE /api/v1/households/members/{bob.id}` as Alice.
- **Then:** Response 404. `error.code` is `"NOT_FOUND"`. (Bob is not a member of HH-A.)
- **Mock:** None.

---

### Cross-Household Isolation

#### TC-038: Invite token from HH-A cannot be used to join HH-B
- **Type:** Integration
- **Given:** `InviteTokenModel` for `HH-A` with token `X`. Admin in `HH-B`.
- **When:** User from another household attempts registration with invite token `X`.
- **Then:** Registration succeeds. The new user is added to `HH-A` (the token's household), NOT `HH-B`. (This tests the token→household mapping, not cross-household prevention — invite tokens are inherently single-household.)
- **Mock:** None.
- **Note:** This test validates that the `household_id` from the invite token is used, not any user-supplied household.

#### TC-039: Admin from HH-A cannot list HH-B's members
- **Type:** Integration
- **Given:** Admin Alice in `HH-A`. User Bob in `HH-B`.
- **When:** Alice sends `GET /api/v1/households/members` with her token.
- **Then:** Response includes only members of `HH-A`. Bob (from `HH-B`) is NOT in the list.
- **Mock:** None. Create two separate households with factory_boy.

#### TC-040: Admin from HH-A cannot remove HH-B's member
- **Type:** Integration
- **Given:** Admin Alice in `HH-A`. User Bob in `HH-B`.
- **When:** Alice sends `DELETE /api/v1/households/members/{bob.id}`.
- **Then:** Response 404 (Bob is not found in Alice's household scope).
- **Mock:** None.

#### TC-041: Removed member's refresh tokens are deleted (cannot refresh)
- **Type:** Integration
- **Given:** Bob is removed from `HH-A` as in TC-032.
- **When:** Bob attempts `POST /api/v1/auth/refresh` with his old refresh token cookie.
- **Then:** Response 401.
- **When:** Bob attempts `POST /api/v1/auth/login` with his old credentials.
- **Then:** Response 401 (user no longer exists in DB).
- **Mock:** None.

---

## 3. Frontend Test Cases

Test files: Co-located with feature:
- `src/features/auth/LoginPage.test.tsx`
- `src/features/auth/RegisterPage.test.tsx`
- `src/features/auth/hooks.test.ts`
- `src/features/household/MembersPage.test.tsx`
- `src/features/household/InvitePage.test.tsx`
- `src/shared/auth.test.ts`
- `src/api/client.test.ts` (interceptor tests)

**Framework:** vitest + @testing-library/react.
**Mocking:** MSW (Mock Service Worker) for all API endpoints.
**Token store:** Module-level variable in `src/shared/auth.ts` — tests must `import { getAccessToken, setAccessToken, clearAccessToken }` by named import (no default export).
**Envelope unwrap:** MSW handlers must return the full envelope `{ success, data, error }` — the axios interceptor unwraps `response.data.data` so components receive the payload directly.

---

#### TC-042: LoginPage renders form and submits credentials
- **Type:** Component
- **Given:** `LoginPage` is rendered at `/login`.
- **When:** User fills in email and password fields and clicks Submit.
- **Then:** The form calls `POST /api/v1/auth/login` with the correct payload. On 200, `setAccessToken()` is called with the returned token. User is navigated to `/` (dashboard).
- **Mock:** MSW handler for `POST /api/v1/auth/login` returns 200 with `RegisterResponseData`.

#### TC-043: LoginPage shows Zod validation errors
- **Type:** Component
- **Given:** `LoginPage` is rendered.
- **When:** User clicks Submit with empty fields, or invalid email format.
- **Then:** Validation error messages are displayed. No API call is made.
- **Mock:** None (Zod validation is synchronous).

#### TC-044: LoginPage displays API error message
- **Type:** Component
- **Given:** `LoginPage` is rendered.
- **When:** User submits valid-looking credentials. API returns 401.
- **Then:** Error message "Invalid email or password" (or similar) is displayed on the form.
- **Mock:** MSW handler returns 401 with `{ success: false, data: null, error: { code: "UNAUTHORIZED", message: "Invalid email or password" } }`.

#### TC-045: RegisterPage creates first user (no invite token)
- **Type:** Component
- **Given:** `RegisterPage` is rendered at `/register` (no `?token=` in URL).
- **When:** User fills in name, email, password and clicks Submit.
- **Then:** `POST /api/v1/auth/register` is called with `{ name, email, password, invite_token: null }`. On 200, `setAccessToken()` is called. User is navigated to `/`.
- **Mock:** MSW handler returns 200 with register response.

#### TC-046: RegisterPage pre-fills invite token from URL
- **Type:** Component
- **Given:** `RegisterPage` is rendered at `/register?token=ABC123`.
- **When:** Page loads.
- **Then:** The invite token field is pre-filled with `"ABC123"`. The field is visible.
- **When:** User fills in remaining fields and submits.
- **Then:** `POST /api/v1/auth/register` is called with `{ ..., invite_token: "ABC123" }`.
- **Mock:** MSW handler returns 200.

#### TC-047: RegisterPage shows Zod validation errors
- **Type:** Component
- **Given:** `RegisterPage` is rendered.
- **When:** User clicks Submit with empty name, bad email, or 7-character password.
- **Then:** Inline validation errors appear. No API call made.
- **Mock:** None.

#### TC-048: Logout clears in-memory token and redirects
- **Type:** Component
- **Given:** User is logged in (access token set).
- **When:** User clicks "Logout" button.
- **Then:** `POST /api/v1/auth/logout` is called. `clearAccessToken()` is called. User is navigated to `/login`.
- **Mock:** MSW handler returns 200 for logout. Use `mockNavigate` for router assertion.

#### TC-049: Token refresh interceptor: 401 → refresh succeeds → retry
- **Type:** Hook / Integration
- **Given:** A valid refresh token cookie exists (simulated). An initial API call to a protected endpoint returns 401.
- **When:** The axios response interceptor catches the 401.
- **Then:** `POST /api/v1/auth/refresh` is called. Returns 200 with new access token. `setAccessToken(newToken)` is called. The original failed request is retried with the new token and succeeds.
- **Mock:** MSW handlers: first call to any protected endpoint returns 401; `/auth/refresh` returns 200 with new token; retried request returns 200.

#### TC-050: Token refresh interceptor: 401 → refresh fails → redirect to login
- **Type:** Hook / Integration
- **Given:** A valid-looking but expired refresh token cookie exists. Initial API call returns 401.
- **When:** The interceptor calls `POST /api/v1/auth/refresh`.
- **Then:** Refresh returns 401. `clearAccessToken()` is called. User is redirected to `/login`.
- **Mock:** MSW returns 401 for both the initial request and the refresh attempt.

#### TC-051: MembersPage renders member list with role badges
- **Type:** Component
- **Given:** User is authenticated as admin. `MembersPage` renders.
- **When:** Page loads.
- **Then:** `GET /api/v1/households/members` is called. A list of members is displayed with name, email, role badge ("admin" or "member"), and join date.
- **Mock:** MSW returns `PaginatedResponse<MemberOut>` with 3 members.

#### TC-052: MembersPage pagination controls navigate pages
- **Type:** Component
- **Given:** `MembersPage` renders with 25 members (page_size=20).
- **When:** User clicks "Next" pagination button.
- **Then:** `GET /api/v1/households/members?page=2&page_size=20` is called. Page 2 items are displayed.
- **Mock:** MSW returns paginated responses based on query params.

#### TC-053: MembersPage admin can remove a member
- **Type:** Component
- **Given:** Admin user views `MembersPage`. Member "Bob" is listed.
- **When:** Admin clicks "Remove" on Bob's row. Confirms in dialog.
- **Then:** `DELETE /api/v1/households/members/{bob.id}` is called. On success, Bob is removed from the list (React Query cache invalidation).
- **Mock:** MSW returns 200 for delete. Assert `queryClient.invalidateQueries` was called for the members key.

#### TC-054: MembersPage non-admin cannot see remove button
- **Type:** Component
- **Given:** User with `role="member"` views `MembersPage`.
- **When:** Page renders.
- **Then:** The remove button is NOT rendered for any member row.
- **Mock:** MSW returns members list where current user has `role="member"`.

#### TC-055: InvitePage generates and displays token
- **Type:** Component
- **Given:** Admin user views `InvitePage`.
- **When:** Admin clicks "Generate Invite" button.
- **Then:** `POST /api/v1/households/invites` is called. The returned token and expiry time are displayed. A "Copy to clipboard" button is visible.
- **Mock:** MSW returns 201 with `{ token: "abc...", expires_at: "..." }`.

#### TC-056: InvitePage non-admin sees forbidden message
- **Type:** Component
- **Given:** Non-admin (member) user navigates to `/household/invites`.
- **When:** The `AdminRoute` guard checks the user's role.
- **Then:** A "forbidden" or "access denied" message is displayed. The invite form is not rendered.
- **Mock:** MSW for `GET /households/members` returns the current user with `role="member"`.

#### TC-057: RequestResetPage submits email and shows success
- **Type:** Component
- **Given:** User visits `/reset-password`.
- **When:** User enters email and submits.
- **Then:** `POST /api/v1/auth/reset-password/request` is called. A success message "If the email exists, a reset link has been sent" is displayed. The form is replaced by the success message.
- **Mock:** MSW returns 200.

#### TC-058: ResetPasswordPage submits token + new password
- **Type:** Component
- **Given:** User visits `/reset-password/confirm` with `?token=XYZ`.
- **When:** User enters new password and confirms.
- **Then:** `POST /api/v1/auth/reset-password/confirm` is called with `{ token: "XYZ", new_password: "..." }`. On success, a success message is shown with a link to `/login`.
- **Mock:** MSW returns 200.

#### TC-059: ProtectedRoute redirects to /login when unauthenticated
- **Type:** Component
- **Given:** No access token (`getAccessToken()` returns null). Refresh attempt also fails.
- **When:** User navigates to any protected route (e.g., `/household/members`).
- **Then:** User is redirected to `/login?redirect=/household/members`.
- **Mock:** Clear token store before test. MSW for `/auth/refresh` returns 401.

#### TC-060: AdminRoute shows forbidden state for non-admin user
- **Type:** Component
- **Given:** User is authenticated but `role="member"`.
- **When:** User navigates to `/household/invites` (admin-only route).
- **Then:** A forbidden/unauthorized message is displayed. The protected content is not rendered.
- **Mock:** MSW returns member list where current user has `role="member"`.

## 4. Coverage Notes

### Intentional gaps
- **Email delivery:** Password reset and invite email sending are explicitly out of scope per SPEC-001 §4. Tests for the `reset_token` response field in dev mode cover the token generation path; actual email sending is not tested.
- **Account deletion:** Out of scope per SPEC-001 §4. When implemented, TC-032 (member removal) can serve as a template for cascade-delete tests.
- **Password complexity rules:** Currently min 8 chars only. Test TC-008 covers this. If rules are tightened later, add corresponding Pydantic unit tests.
- **Refresh token multi-device support:** Single-session with rotation. Tests TC-012 and TC-017 validate rotation. If multi-device support is added later, tests must change to allow multiple concurrent refresh tokens.

### Manual testing scenarios
- **Concurrent registration race:** Two users registering with the same email simultaneously. The UNIQUE constraint on `users.email` prevents duplicates at DB level. Manual testing with concurrent requests is recommended to verify the 409 response is returned correctly.
- **Clock skew:** Token expiry relies on server clock. If the server clock is skewed, tokens may expire prematurely. This is an operational concern, not a code bug.
- **Invite token sharing UX:** The admin copies and shares the token out-of-band. Manual verification of the copy-to-clipboard UX and the registration flow with the token is recommended.

### Coverage target
- **Backend (80%):** All service-layer business logic is covered by integration tests (TC-001 to TC-041). The 80% target should be achievable with these tests plus Pydantic unit tests.
- **Frontend (70%):** All page components and hooks are covered by component tests (TC-042 to TC-060). The router guard tests (TC-059, TC-060) cover the `ProtectedRoute` and `AdminRoute` logic.
