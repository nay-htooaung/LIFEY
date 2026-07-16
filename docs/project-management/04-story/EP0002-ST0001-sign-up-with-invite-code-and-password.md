---
title: "Sign Up with Invite Code and Password"
status: Draft
type: user_story
epic: "User Authentication"
story_number: ST0001
---

## Story

**As a** new user,  
**I want** to sign up using an invite code and create a password,  
**so that** I can join LIFEY privately — only people with a code can access the app, and I can log in directly without email links.

---

## Acceptance Criteria

### Step 1 — Invite code gates the entry

```gherkin
@AC-001
Given I open LIFEY for the first time
When I see the welcome screen
Then the only input visible is the invite code field
And there is no email or password field yet

@AC-002
Given I am on the welcome screen
When I enter a valid, unused invite code
And I tap "Continue"
Then the invite code is accepted
And the sign-up form (email + password) appears

@AC-003
Given I am on the welcome screen
When I enter an invalid invite code
Then I see an error "Invalid invite code — check with the person who invited you"

@AC-004
Given I am on the welcome screen
When I enter an expired invite code
Then I see an error "This invite code has expired"

@AC-005
Given I am on the welcome screen
When I enter an invite code that has already been used
Then I see an error "This invite code has already been used"
```

### Step 2 — Create account with email + password

```gherkin
@AC-006
Given I have entered a valid invite code
When I enter my email address
And I enter a password (at least 8 characters)
And I confirm the password
And I tap "Create Account"
Then my account is created
And I am authenticated immediately
And I am taken to the main app

@AC-007
Given I am on the sign-up form
When I enter a password shorter than 8 characters
Then I see an error "Password must be at least 8 characters"

@AC-008
Given I am on the sign-up form
When I enter a password and a different confirmation password
And I tap "Create Account"
Then I see an error "Passwords do not match"

@AC-009
Given I am on the sign-up form
When I enter an email that is already registered
And I tap "Create Account"
Then I see an error "An account with this email already exists — please log in instead"
```

### Step 3 — Account creation completes

```gherkin
@AC-010
Given I have submitted the sign-up form with valid details
Then my account is created without requiring email verification
And a personal household is created for me
And the invite code is marked as used
And the Supabase session is persisted (7-day expiry)

@AC-011
Given I have an invite code linked to a shared household (household_id not null)
When I complete sign-up
Then I am automatically added as a member of that shared household

@AC-012
Given I entered a valid invite code earlier
When I try to sign up again with a different email on the same device
Then I must enter the invite code again
```

---

## State diagram

```
                    ┌──────────────┐
                    │  Welcome     │
                    │  [invite___] │
                    │  [Continue]  │
                    └──────┬───────┘
                           │ code valid?
                    ┌──────▼───────┐
                    │  Sign-up     │
                    │  [email___]  │
                    │  [password]  │
                    │  [confirm]   │
                    │  [Create]    │
                    └──────┬───────┘
                           │ validated
                    ┌──────▼───────┐
                    │  ✅ Account  │
                    │  created!    │
                    │  → main app  │
                    └──────────────┘
```

## Notes

- The invite code **gates the entire app** — LIFEY is not open sign-up. Only people who receive a code can create an account.
- **No email verification** — accounts are auto-confirmed on sign-up. This keeps the entire flow inside the PWA with no link-clicking.
- Returning users skip the invite code step entirely — the login form (email + password) is shown directly on subsequent visits (JWT session persisted by Supabase GoTrue in IndexedDB).
- Password is hashed and stored by Supabase GoTrue — never transmitted or stored in plain text.
- If the invite code is linked to a shared household (`household_id` not null), the user is automatically added as a member of that household during account creation.
- If the invite code is generic (`household_id` is null), the user only gets their personal household and can be invited to shared households later.

## INVEST Checklist

- ✅ **I**ndependent — entry point, no blockers
- ✅ **N**egotiable — exact wording of error messages is flexible
- ✅ **V**aluable — ensures privacy and controlled access
- ✅ **E**stimable — clear scope (~2–3 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — every path has a Gherkin scenario

**Size:** M

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-07-12 | 1.0 | Project Manager | Initial draft (email + password + invite) |
| 2026-07-14 | 2.0 | Tech Lead | Revised for magic link — invite code gates entry, email + magic link replaces password sign-up |
| 2026-07-14 | 3.0 | Project Manager | Revised for password — magic link removed, password + confirm replaces magic link, auto-confirm enabled |
