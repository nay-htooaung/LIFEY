---
title: "Log In / Log Out"
status: Draft
type: user_story
epic: "User Authentication"
---

## Story

**As a** returning user,  
**I want** to log in with a magic link and log out when I'm done,  
**so that** I can access my data securely without remembering a password.

---

## Acceptance Criteria

### Log in

```gherkin
Given I already have an account
When I open LIFEY
Then I see an email field directly (no invite code asked)
And the button says "Send sign-in link"

Given I am on the login screen
When I enter my registered email
And I tap "Send sign-in link"
Then a magic link is sent to my email
And I see a confirmation screen: "Check your inbox — the link expires in 10 minutes"

Given I am on the confirmation screen
When I open my email and tap the magic link
Then my browser opens the app
And I am logged in and taken to the main app

Given I am on the login screen
When I enter an email that is not registered
And I tap "Send sign-in link"
Then I see a confirmation screen: "If an account exists for this email, you'll receive a sign-in link"
(Same message for both registered and unregistered emails — prevents email enumeration)
```

### Log out

```gherkin
Given I am logged in
When I tap "Log Out" from the settings/profile menu
Then I am logged out
And my session is cleared
And I am taken back to the login screen
And the invite code step is not shown again

Given I am logged out
When I open the app
Then I see the email input directly (skip invite code)
```

### Session

```gherkin
Given I am logged in
When I close the app and reopen it within 7 days
Then I am still logged in (session persisted)

Given I am logged in
When I return after more than 7 days of inactivity
Then I am prompted to log in again
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
