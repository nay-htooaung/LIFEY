---
title: "Session Persistence"
status: Draft
type: user_story
epic: "User Authentication"
---

## Story

**As a** returning user,  
**I want** the app to remember my login so I don't have to sign in every time I open it.

---

## Acceptance Criteria

```gherkin
Given I have logged in successfully
When I close and reopen the app
Then I am still logged in
And I see the main app without going through the login screen

Given I have logged in successfully
When I restart my device and open the app
Then I am still logged in

Given I have logged in successfully
When I tap "Log Out"
Then my session is cleared
And subsequent app opens show the login screen

Given I have logged in successfully
When I uninstall and reinstall the app
Then my session is lost
And I see the login screen on first open

Given my session token has been revoked server-side
When I open the app
Then I am silently redirected to the login screen
And I see no error message (silent fallback)
```

---

## INVEST Checklist

- ✅ **I**ndependent — built after login works
- ✅ **N**egotiable — storage mechanism (SecureStore vs simple) is open
- ✅ **V**aluable — eliminates daily re-login friction
- ✅ **E**stimable — clear scope (~1 day)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — each scenario can be verified

**Size:** S
