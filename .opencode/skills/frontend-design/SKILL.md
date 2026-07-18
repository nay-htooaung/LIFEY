---
name: frontend-design
description: >-
  Screen design workflow, Brilliant tool reference, design review checklist,
  and handoff guidance for the frontend-designer agent. Use this skill when
  creating new screens, validating layouts, or preparing designs for handoff
  to the dev-agent.
---

## Design Brief Checklist

Before designing, verify:

- [ ] Read the story — which AC does this screen serve?
- [ ] Read the epic — what's the scope boundary?
- [ ] Read `.opencode/frontend-structure.md` — screen inventory, navigation, and rules
- [ ] Check existing canvases for related screens
- [ ] Check `docs/design/Lifey/*.design` for exported screen snapshots
- [ ] Check `docs/design/Lifey/Components/*.design` for reusable component patterns
- [ ] Read `docs/design/Styles/default.styles` for canonical design tokens
- [ ] Load Brilliant knowledge (≥6 keys for DSL work)
- [ ] Confirm brief with user

## Local Design Assets

The `docs/design/` directory contains the project's design source of truth:

| Path | Contents | Editable? |
|------|----------|-----------|
| `docs/design/Styles/default.styles` | LIFEY design system tokens (colors, fonts, spacing, shadows) | ✅ Yes — update tokens here |
| `docs/design/Assets/` | Image assets (icons, logos, exported screenshots) | ✅ Yes — add assets here |
| `docs/design/Lifey.design` | Single canvas: 8 screens + 11 component masters | ❌ Never edit — Brilliant-managed |
| `docs/design/Canvas.design` | Scratch canvas config | ❌ Never edit — Brilliant-managed |
| `docs/design/.brilliant/` | Brilliant internal data | ❌ Never edit — Brilliant-managed |

**Rule:** Never manually edit `.design` files, `Canvas.design`, or `.brilliant/`. These are managed by Brilliant's export/sync. Edit tokens in `Styles/default.styles` and add assets to `Assets/`.

## Design Proposal & Confirmation

Before creating anything on the canvas, synthesize what you've learned and get sign-off.

### 1. Build the Proposal

After completing the Design Brief Checklist, produce a structured proposal covering:

**Screens:**
- List every screen needed, with the story ref and specific AC(s) it serves
- Screenshot-free: describe the core purpose and what state/action each AC maps to

**Navigation flow:**
- Map the user journey: `Screen A → Screen B → Screen C`
- Indicate trigger (button tap, submission, system navigation)
- Note loading, empty, error, and edge-case states

**Design decisions:**
- New component variants or patterns proposed
- Reuse of existing component masters (reference by name)
- Any deviations from the dark theme or existing tokens
- Non-obvious layout choices (e.g., bottom sheet vs full screen, stepper vs single form)

**AC-to-Screen Mapping:**
```
| AC       | Screen(s)          | Visual element / state            |
|----------|--------------------|-----------------------------------|
| AC-001   | Sign In            | Email input + "Send link" button  |
| AC-002   | Check Email        | Confirmation message + icon state |
| ...      | ...                | ...                               |
```

### 2. Human Checkpoint — Confirm the Proposal

Present the proposal to the user and wait for approval before designing:

> **Design Proposal: EP0002-ST0001 — Sign in with Magic Link**
>
> **Screens:** 2
> 1. Sign In — single email input + "Send sign-in link" button (AC-001)
> 2. Check Email — confirmation with app icon, email display, instruction text, resend link (AC-002, AC-003)
>
> **Flow:** Sign In → (tap Send) → Check Email
>
> **States per screen:**
> - Sign In: default, validation error (invalid email), submitting (loading spinner)
> - Check Email: default, resend cooldown (60s timer)
>
> **Design decisions:**
> - Reuse `Button/Primary` component for CTA
> - New `Input/Email` pattern (icon prefix, validation state)
> - No navigation bar — clean minimal auth screens (logo + form only)
> - Error state: inline red message below email input, not a toast
>
> **AC coverage:**
> - AC-001 → Sign In screen, email input + submit button
> - AC-002 → Check Email screen, confirmation message
> - AC-003 → Check Email screen, resend link with cooldown
>
> **Confirm?** (Y/n) — wait for answer.

**Do not proceed to design until the user confirms.** If the user suggests changes, update the proposal and reconfirm.

---

## AC-to-Design Traceability

### 1. Maintain a Trace Map

Throughout the design process, keep a running traceability matrix. This ensures every acceptance criterion has visual coverage and no design element is orphaned (not serving a story).

Store the trace in your session notes (not a file — it is ephemeral working memory):

```
## Trace: EP0002-ST0001
| AC     | Screen        | Element / state                      | Verified |
|--------|---------------|--------------------------------------|----------|
| AC-001 | lifey-sign-in | Email input field                    | ✅       |
| AC-001 | lifey-sign-in | "Send sign-in link" button           | ✅       |
| AC-001 | lifey-sign-in | Error state: invalid email message   | ✅       |
| AC-002 | lifey-check-email | Confirmation heading "Check your email" | ✅    |
| AC-002 | lifey-check-email | Email display (masked)             | ✅       |
| AC-003 | lifey-check-email | "Resend" link with 60s cooldown   | ✅       |
```

### 2. Design Review: AC Mapping Check

After all screens are built, review each AC against the designed screens:

| Check | How |
|-------|-----|
| Every AC maps to ≥1 visual element or state | Trace each AC number from the story to a specific element ID or state variant |
| No element exists that doesn't serve an AC | Orphaned elements = scope creep. Flag and remove unless the user confirms intent |
| States are complete | For each AC, verify success, error, loading, and empty states are designed where the story implies them (Gherkin's Given/When/Then) |
| Edge cases handled | Validation messages, 404 states, offline indicators, rate limiting — if the story's ACs imply these, they must be on the canvas |

### 3. If Mismatches Found

- **Missing AC coverage:** Add the needed screen element or state before proceeding
- **Orphaned design element:** Remove or explicitly confirm with the user
- **Scope creep (screen serves no AC):** Remove the screen or get sign-off to extend the story

---

## Final Review

After all screens are designed, validated, and AC-mapped, run a final review before handoff.

### 1. Self-Review

Run the [Design Review Checklist](#design-review-checklist) one last time across every screen.

### 2. Frontend Review Subagent (Optional)

For complex multi-screen stories or when the user requests extra scrutiny, invoke the `frontend-review` subagent:

```bash
task "Review designs for EP0002-ST0001" frontend-review
```

The subagent checks:
1. **AC-to-Design traceability** — every AC covered, nothing orphaned
2. **Design system compliance** — tokens match `default.styles`, component library used
3. **Cross-screen consistency** — buttons, spacing, headers match across screens
4. **No scope creep** — screens and elements stay within story/epic boundaries
5. **Visual quality** — contrast, spacing, overflow, no phone chrome

### 3. Handoff

Once the review passes (self-review or subagent), update the handoff doc and notify the dev-agent. See [Handoff to Dev Agent](#handoff-to-dev-agent) below.

---

## Brilliant Tool Quick Reference

### Creating screens (default path)

```python
# Screen template — app UI only, no phone chrome
# Use $tokens from docs/design/Styles/default.styles when possible
brilliant_create_html(
  canvasId="Lifey/<Folder>",
  html="""<div style="width:390px;height:844px;background:#0D0D1F;border-radius:40px;overflow:hidden;display:flex;flex-direction:column;padding:0 24px;">
    ...nav, header, content, buttons — no status bar or home indicator...
  </div>"""
)
```

### Modifying existing elements

```python
brilliant_create_modify_elements(
  canvasId="Lifey/<Folder>",
  elements="<element-id> <new-prop>"
)
```

### Using component instances

All screens and component masters live on the **same canvas** (`Lifey`), so `inst()` always works. Screens are positioned on the left, component masters on the right (p(1760,0)), grouped by category (Inputs, Buttons, Navigation, Feedback).

### Validating layout

```python
brilliant_lookup(scope: ["Lifey/<Folder>", "<element-id>"], format: "blueprint")
# Check for:
# - s(390,844) on outer frame (not s(390,hug))
# - s(fill,fill) spacers between content and buttons
# - No width overflow warnings
# - Text has s(fill,hug) for wrapping
```

## Design Review Checklist

### Structural checks
- [ ] Outer frame: `s(390,844)` with `clip`
- [ ] Checked `Lifey/Components/*` first for reusable patterns before building from scratch
- [ ] No phone chrome — no status bar (9:41, signal, battery), no home indicator, no device mockups
- [ ] No content overflows parent width (max 342px inside 24px side padding)
- [ ] Fill spacers actually push content (not collapsed in hug parent)
- [ ] Text that wraps has `s(fill,hug)`
- [ ] Buttons at bottom of screen (pushed by fill spacer)
- [ ] Color contrast: secondary text at `#9CA3AF` or above
- [ ] Consistent padding: 24px sides, content starts naturally from top
- [ ] Frame has a descriptive name (not "Frame 1")
- [ ] Session file updated with new screen
- [ ] Token values match `docs/design/Styles/default.styles`

### AC traceability checks
- [ ] Traceability matrix populated for every AC in the story
- [ ] Every AC has ≥1 corresponding screen element or state
- [ ] No orphaned elements (everything serves an AC or was explicitly confirmed)
- [ ] Success, error, loading, and empty states are covered where the story implies them
- [ ] Edge cases (validation, 404, offline, rate limiting) addressed if ACs imply them

## Handoff to Dev Agent

When designs are approved:

1. Note which story AC each screen maps to
2. Include the **AC traceability matrix** from your session notes so the dev-agent knows exactly what to implement for each criterion
3. Document any component specs (spacing, states, variants)
4. If new design tokens are needed, update `docs/design/Styles/default.styles` and notify tech-lead via ADR
5. Attach PNG exports (only on request) so the dev-agent has visual references
