---
title: "Sign Up with Email + Password + Invite Keycode"
status: Draft
type: user_story
epic: "User Authentication"
---

## Story

**As a** new user,  
**I want** to sign up with an invite keycode, email, and password,  
**so that** I can join LIFEY privately.

---

## Acceptance Criteria

```gherkin
Given I am on the sign-up screen
When I enter a valid invite keycode, email, and password
And I confirm my password
And I tap "Sign Up"
Then my account is created
And a personal household is created for me
And the invite keycode is marked as used
And I am logged in and taken to the main app

Given I am on the sign-up screen
When I enter an invalid or expired invite keycode
Then I see an error "Invalid invite keycode"

Given I am on the sign-up screen
When I enter a keycode that has already been used
Then I see an error "This keycode has already been used"

Given I am on the sign-up screen
When I enter an email that is already registered
Then I see an error "An account with this email already exists"

Given I am on the sign-up screen
When I enter a password with fewer than 8 characters
Then I see an error "Password must be at least 8 characters"

Given I am on the sign-up screen
When I leave the keycode field empty
Then the "Sign Up" button is disabled
```

---

## INVEST Checklist

- ✅ **I**ndependent — entry point, no blockers
- ✅ **N**egotiable — validation rules open to discussion
- ✅ **V**aluable — user can create an account
- ✅ **E**stimable — clear scope (~2–3 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — every path has a Gherkin scenario

**Size:** M
