---
title: "Log In / Log Out"
status: Draft
type: user_story
epic: "User Authentication"
---

## Story

**As a** returning user,  
**I want** to log in with my email and password, and log out when I'm done,  
**so that** I can access my data securely.

---

## Acceptance Criteria

```gherkin
Given I am on the log-in screen
When I enter my registered email and correct password
And I tap "Log In"
Then I am logged in and taken to the main app

Given I am on the log-in screen
When I enter an email that is not registered
Then I see an error "No account found with this email"

Given I am on the log-in screen
When I enter a wrong password for my email
Then I see an error "Incorrect password"

Given I am on the log-in screen
When I tap "Log In" with empty fields
Then the "Log In" button is disabled

Given I am logged in
When I tap "Log Out" from the settings/profile menu
Then I am logged out
And I am taken back to the log-in screen

Given I am logged out
When I open the app
Then I see the log-in screen
```

---

## INVEST Checklist

- ✅ **I**ndependent — can be built after sign-up is done
- ✅ **N**egotiable — error messages and flow details can be adjusted
- ✅ **V**aluable — user can access their account and sign out securely
- ✅ **E**stimable — clear scope (~1–2 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — every path has a Gherkin scenario

**Size:** S
