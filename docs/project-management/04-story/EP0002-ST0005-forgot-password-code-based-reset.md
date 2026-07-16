---
title: "Forgot Password — Code-Based Reset"
status: Draft
type: user_story
epic: "User Authentication"
story_number: ST0005
---

## Story

**As a** returning user who has forgotten their password,  
**I want** to request a 6-digit reset code by email and set a new password within the app,  
**so that** I can regain access to my account without needing to click a browser link.

---

## Acceptance Criteria

### Step 1 — Request reset code

```gherkin
@AC-001
Given I am on the login screen
When I tap "Forgot password?"
Then I am taken to the forgot password screen
And I see an email input and a "Send reset code" button

@AC-002
Given I am on the forgot password screen
When I enter my registered email
And I tap "Send reset code"
Then a 6-digit reset code is sent to my email
And I see a confirmation screen: "Check your inbox — the code expires in 10 minutes"
And the code input screen appears

@AC-003
Given I am on the forgot password screen
When I enter an email that is not registered
And I tap "Send reset code"
Then I see a confirmation screen: "If an account exists for this email, a reset code will be sent"
(Same message for both registered and unregistered emails — prevents email enumeration)
```

### Step 2 — Code verification

```gherkin
@AC-004
Given I am on the code input screen
When I enter the correct 6-digit reset code
Then the code is verified
And I am taken to the new password screen

@AC-005
Given I am on the code input screen
When I enter an incorrect 6-digit reset code
Then I see an error "Invalid code — please try again"

@AC-006
Given I received a reset code
When I do not enter it within 10 minutes
And I try to submit an expired code
Then I see an error "This code has expired — request a new one"
And I can tap "Send new code" to get another

@AC-007
Given I am on the code input screen
When I have not received the email
Then I can tap "Resend code" to send a new code
And the 10-minute timer resets
```

### Step 3 — Set new password

```gherkin
@AC-008
Given I have entered a valid reset code
When I enter a new password (at least 8 characters)
And I confirm the new password
And I tap "Reset Password"
Then my password is updated
And I am authenticated and taken to the main app

@AC-009
Given I am on the new password screen
When I enter a password shorter than 8 characters
Then I see an error "Password must be at least 8 characters"

@AC-010
Given I am on the new password screen
When I enter a new password and a different confirmation
And I tap "Reset Password"
Then I see an error "Passwords do not match"
```

### Step 4 — Rate limiting

```gherkin
@AC-011
Given I requested a reset code
When I tap "Resend code" more than 3 times within 15 minutes
Then I see an error "Too many attempts — please wait before requesting another code"

@AC-012
Given I am on the code input screen
When I enter the wrong code 5 times in a row
Then the code is invalidated
And I am told to request a new code
```

---

## State diagram

```
                    ┌──────────────┐
                    │  Login       │
                    │  [forgot?]   │
                    └──────┬───────┘
                           │ tap
                    ┌──────▼───────┐
                    │  Enter email │
                    │  [Send code] │
                    └──────┬───────┘
                           │ code sent
                    ┌──────▼───────┐
                    │  [_][_][_]   │  ← 6-digit input
                    │  [_][_][_]   │
                    │  [Verify]    │
                    └──────┬───────┘
                           │ correct?
                    ┌──────▼───────┐
                    │  New password│
                    │  [password]  │
                    │  [confirm]   │
                    │  [Reset]     │
                    └──────┬───────┘
                           │ validated
                    ┌──────▼───────┐
                    │  ✅ Password │
                    │  reset!      │
                    │  → main app  │
                    └──────────────┘
```

## Technical Notes

### Edge Function: `send-reset-code`

A Supabase Edge Function (Deno/TypeScript) is required to generate and deliver reset codes:

1. Accepts `{ email }` in the request body
2. Checks rate limits (max 3 codes per email per 15 minutes)
3. Generates a cryptographically random 6-digit code
4. Stores it in a `password_reset_codes` table with:
   - `email`
   - `code` (hashed)
   - `expires_at` (10 minutes from now)
   - `attempts` (0, incremented on failed attempts)
5. Sends email via Supabase's built-in email service / Resend with the code
6. Returns `{ success: true }` (no code leak in response)

### Database table: `password_reset_codes`

```sql
CREATE TABLE password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Verification flow

1. PWA sends `{ email, code }` to the Edge Function
2. Edge Function looks up the record by email, checks expiry + attempts, verifies hash
3. On success: returns a one-time reset token
4. PWA uses the reset token to call `supabase.auth.updateUser({ password })`
5. Record is deleted on success

## INVEST Checklist

- ✅ **I**ndependent — no blockers from other stories
- ✅ **N**egotiable — exact expiry time and rate limits are configurable
- ✅ **V**aluable — users can recover access without contacting support
- ✅ **E**stimable — clear scope (~3–4 days including Edge Function)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — every path has a Gherkin scenario

**Size:** M

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-07-14 | 1.0 | Project Manager | Initial draft — code-based reset flow with Supabase Edge Function |
