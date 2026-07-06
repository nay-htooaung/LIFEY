# SPEC-001: Auth & Household

## 1. Metadata
- **Author:** Human (directed per AGENTS.md)
- **Status:** Draft
- **Granularity Check:** One single context boundary? [x] Yes. Auth and household membership are inherently coupled (household creation at registration, invite-only joining).

## 2. The 5W1H Intent
- **Who:** A household member (admin or invited user).
- **What:** Register a new account (with or without invite token), log in/out, maintain session via JWT refresh, manage household membership (invite, join, remove).
- **Where:** Frontend (React SPA) ↔ Backend (FastAPI, `/api/v1/auth/*`, `/api/v1/households/*`) ↔ PostgreSQL.
- **When:** Every user action in the application depends on authenticated identity and household scoping.
- **Why:** To establish trust, data isolation (`household_id`), and invite-only access — no public sign-up.

## 3. Acceptance Criteria (Given-When-Then)

### US-001: Register first user + create household
- **Given** no household exists for the registering user,
- **When** the user submits a registration form with name, email, and password,
- **Then** a new household is created, the user is added as the household admin, and an access + refresh token pair is returned.

### US-002: Login / Logout
- **Given** a registered user,
- **When** the user submits valid email and password to `POST /api/v1/auth/login`,
- **Then** an access token (short-lived, in-memory) and refresh token (long-lived, `httpOnly` cookie) are returned.
- **Given** a logged-in user,
- **When** the user clicks "Logout",
- **Then** the refresh token cookie is cleared and the session ends.

### US-003: JWT refresh
- **Given** a logged-in user with an expired access token,
- **When** the frontend calls `POST /api/v1/auth/refresh` with the `httpOnly` cookie,
- **Then** a new access token is returned without requiring re-login.

### US-004: Invite members
- **Given** a logged-in household admin,
- **When** the admin requests a new invite token,
- **Then** a unique, time-limited invite link/token is generated and displayed for sharing.

### US-005: Join via invite
- **Given** a prospective user with a valid invite token,
- **When** the user submits registration with name, email, password, and the invite token,
- **Then** the user is added to the inviting household and an access + refresh token pair is returned.

### US-006: Manage members
- **Given** a logged-in household admin,
- **When** the admin views the household members page,
- **Then** a list of all members (name, email, role, join date) is displayed.
- **When** the admin removes a member,
- **Then** that member loses access to the household data.

### US-007: Password reset
- **Given** a registered user who forgot their password,
- **When** the user requests a password reset with their email,
- **Then** a reset link (or token) is sent to the email (or displayed in dev).
- **When** the user submits a new password with a valid reset token,
- **Then** the password is updated and the user can log in with the new password.

## 4. Out of Scope (Guardrails)
- Do NOT implement OAuth / social login (Google, GitHub, etc.).
- Do NOT implement multi-factor authentication (2FA).
- Do NOT implement role-based access beyond admin/member (no granular permissions).
- Do NOT implement account deletion in this spec (deferred).
- Do NOT implement email delivery service for invite/password-reset emails in this spec. Print tokens to server log / API response for development.
- Do NOT implement PWA installation prompts or offline support.

## 5. API Contracts (Summary)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | No | Register (first user creates household; invite token optional for join) |
| POST | `/api/v1/auth/login` | No | Login, returns tokens |
| POST | `/api/v1/auth/logout` | Yes | Clear session |
| POST | `/api/v1/auth/refresh` | Cookie | Refresh access token |
| POST | `/api/v1/auth/reset-password/request` | No | Request password reset token |
| POST | `/api/v1/auth/reset-password/confirm` | No | Submit new password with reset token |
| GET | `/api/v1/households/members` | Yes | List household members |
| POST | `/api/v1/households/invites` | Yes (admin) | Generate invite token |
| DELETE | `/api/v1/households/members/{user_id}` | Yes (admin) | Remove member |

## 6. Data Model (Summary)

**Tables:**
- `households` — id, name, created_at
- `users` — id, household_id (FK), email, password_hash, name, role (admin/member), created_at
- `invite_tokens` — id, household_id (FK), token, expires_at, used_at, created_at
- `refresh_tokens` — id, user_id (FK), token_hash, expires_at, created_at

All tables carry `household_id` (where applicable) per the data isolation rule.
