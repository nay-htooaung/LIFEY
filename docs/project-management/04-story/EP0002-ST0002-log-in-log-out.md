---
title: "Log In / Log Out"
status: Draft
type: user_story
epic: "User Authentication"
story_number: ST0002
---

## Story

**As a** returning user,  
**I want** to log in with my email and password and log out when I'm done,  
**so that** I can access my data securely without needing to click a link in my email.

---

## Acceptance Criteria

### Log in

```gherkin
@AC-001
Given I already have an account
When I open LIFEY
Then I see an email field and a password field directly (no invite code asked)
And the button says "Log In"
And there is a "Forgot password?" link below the password field

@AC-002
Given I am on the login screen
When I enter my registered email and correct password
And I tap "Log In"
Then I am authenticated
And I am taken to the main app

@AC-003
Given I am on the login screen
When I enter an email that is not registered
And I tap "Log In"
Then I see an error "Invalid email or password"
(Same message for both wrong password and unregistered email — prevents email enumeration)

@AC-004
Given I am on the login screen
When I enter my registered email and an incorrect password
And I tap "Log In"
Then I see an error "Invalid email or password"
```

### Log out

```gherkin
@AC-005
Given I am logged in
When I tap "Log Out" from the settings/profile menu
Then I am logged out
And my session is cleared
And I am taken back to the login screen
And the invite code step is not shown again

@AC-006
Given I am logged out
When I open the app
Then I see the email and password fields directly (skip invite code)
```

### Session

```gherkin
@AC-007
Given I am logged in
When I close the app and reopen it within 7 days
Then I am still logged in (session persisted)

@AC-008
Given I am logged in
When I return after more than 7 days of inactivity
Then I am prompted to log in again
```

### Password field UX

```gherkin
@AC-009
Given I am on the login screen
When I type my password
Then the password characters are masked by default
And there is a toggle (eye icon) to show/hide the password

@AC-010
Given I am on the login screen
When I tap "Forgot password?"
Then I am taken to the forgot password flow
```

---

## INVEST Checklist

- ✅ **I**ndependent — can be built after sign-up is done
- ✅ **N**egotiable — session duration is configurable
- ✅ **V**aluable — user can access their account and sign out securely
- ✅ **E**stimable — clear scope (~1–2 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — every path has a Gherkin scenario

**Size:** S

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-07-12 | 1.0 | Project Manager | Initial draft (email + password login) |
| 2026-07-14 | 2.0 | Tech Lead | Revised for magic link — password removed, "Send sign-in link" flow, anti-enumeration messaging |
| 2026-07-14 | 3.0 | Project Manager | Revised for password — email + password login restored, "Forgot password?" link added, password visibility toggle |
