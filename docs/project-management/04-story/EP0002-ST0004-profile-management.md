---
title: "Profile Management"
status: Draft
type: user_story
epic: "User Authentication"
story_number: ST0004
---

## Story

**As a** user,  
**I want** to set and edit my display name and avatar,  
**so that** other household members can recognize me.

---

## Acceptance Criteria

```gherkin
@AC-001
Given I am logged in
When I navigate to my profile settings
Then I see my current display name and avatar

@AC-002
Given I am on my profile settings
When I change my display name and save
Then my display name is updated
And the new name appears in the app (e.g., task assignments, household member list)

@AC-003
Given I am on my profile settings
When I upload a new avatar image
Then my avatar is updated
And the new avatar appears throughout the app

@AC-004
Given I am on my profile settings
When I clear my avatar
Then my avatar reverts to the default placeholder

@AC-005
Given I am on my profile settings
When I save with an empty display name
Then I see an error "Display name cannot be empty"
```

---

## INVEST Checklist

- ✅ **I**ndependent — no dependencies on other stories
- ✅ **N**egotiable — avatar file size limits, image cropping can be discussed
- ✅ **V**aluable — personalization and recognition in shared spaces
- ✅ **E**stimable — clear scope (~1–2 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — every path has a Gherkin scenario

**Size:** S
