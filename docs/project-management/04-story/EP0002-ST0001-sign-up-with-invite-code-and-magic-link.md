---
title: "Sign Up with Invite Code and Magic Link"
status: Draft
type: user_story
epic: "User Authentication"
story_number: ST0001
---

## Story

**As a** new user,  
**I want** to sign up using an invite code and a magic link,  
**so that** I can join LIFEY privately — only people I share a code with can access the app.

---

## Acceptance Criteria

### Step 1 — Invite code gates the entry

```gherkin
@AC-001
Given I open LIFEY for the first time
When I see the welcome screen
Then the only input visible is the invite code field
And there is no email field yet

@AC-002
Given I am on the welcome screen
When I enter a valid, unused invite code
And I tap "Continue"
Then the invite code is accepted
And the email input appears for the next step

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

### Step 2 — Magic link sign-in

```gherkin
@AC-006
Given I have entered a valid invite code
When I enter my email address
And I tap "Send sign-in link"
Then a magic link is sent to my email
And I see a confirmation screen: "Check your inbox — the link expires in 10 minutes"

@AC-007
Given I am on the confirmation screen
When I open my email and tap the magic link
Then my browser opens the app
And my account is created
And a personal household is created for me
And the invite code is marked as used
And I am logged in and taken to the main app

@AC-008
Given I entered a valid invite code earlier
When I try to sign up again with a different email on the same device
Then I must enter the invite code again
```

### Step 3 — Existing user returns

```gherkin
@AC-009
Given I already have an account
When I open LIFEY
Then I see the email input directly (no invite code needed)
And I can request a magic link to log in
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
                    │  Valid code  │
                    │  [email___]  │
                    │  [Send link] │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  ✉️ Check    │
                    │  your inbox  │ ← 10 min expiry
                    └──────┬───────┘
                           │ magic link clicked
                    ┌──────▼───────┐
                    │  ✅ Logged   │
                    │  in!         │
                    │  → main app  │
                    └──────────────┘
```

## Notes

- The invite code **gates the entire app** — LIFEY is not open sign-up. Only people who receive a code can create an account.
- Returning users skip the invite code step entirely — the email field is shown directly on subsequent visits (session persisted via TanStack Query persister in IndexedDB).
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
