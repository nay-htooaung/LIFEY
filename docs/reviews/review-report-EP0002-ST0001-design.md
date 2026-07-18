# Design Review Report: EP0002-ST0001 — Sign Up with Invite Code and Password

**Screens reviewed:**
- Row 1: Welcome Screen (default), Welcome - Invalid Code Error, Welcome - Expired Code Error, Welcome - Used Code Error
- Row 2: Sign-Up Screen (default), Sign-Up - Password Too Short Error, Sign-Up - Passwords Match Error, Sign-Up - Email Exists Error
- Row 3: Account Created Screen

**Canvas:** `Lifey` (`docs/design/Lifey.design`)
**Reviewed:** 2026-07-18
**Reviewer:** frontend-review

---

## 1. AC-to-Design Traceability

| AC | Screen(s) | Element / state | Status |
|----|-----------|-----------------|--------|
| AC-001 | Welcome Screen (default) | Invite code input field (Frame 10), no email/password fields present | ✅ |
| AC-002 | Sign-Up Screen (default) | Email input (Frame 26), Password input (Frame 30), Confirm Password (Frame 35), "Create Account" button (Frame 44), "Code accepted" badge (Frame 21) | ✅ |
| AC-003 | Welcome - Invalid Code Error | Error text "Invalid invite code — check with the person who invited you" (Text 30, `#EF4444`), red input border | ✅ |
| AC-004 | Welcome - Expired Code Error | Error text "This invite code has expired" (Text 39, `#EF4444`), red input border | ✅ |
| AC-005 | Welcome - Used Code Error | Error text "This invite code has already been used" (Text 48, `#EF4444`), red input border | ✅ |
| AC-006 | Sign-Up Screen (default) → Account Created Screen | Form fields + Create Account button → Success checkmark + "Account created!" heading | ✅ |
| AC-007 | Sign-Up - Password Too Short Error | Error text "Password must be at least 8 characters" (Text 57, `#EF4444`), red border on Password input | ✅ |
| AC-008 | Sign-Up - Passwords Match Error | Error text "Passwords do not match" (Text 67, `#EF4444`), red border on Confirm Password input | ✅ |
| AC-009 | Sign-Up - Email Exists Error | Error text "An account with this email already exists — please log in instead" (Text 74, `#EF4444`), red border on Email input | ✅ |
| AC-010 | Account Created Screen | Success state with checkmark, heading, loading dots — implies backend auto-redirect | ✅ |
| AC-011 | (no visual element needed) | Backend-only: auto-join shared household — no design element required | ✅ |
| AC-012 | Welcome Screen (default) | The Welcome screen exists to re-enter the invite code on subsequent attempts | ✅ |

**Verdict:** ✅ All 12 ACs have visual coverage. No orphaned elements found — every designed element supports a story requirement.

---

## 2. Design System Compliance

| Check | Token (default.styles) | Actual | Status | Details |
|-------|----------------------|--------|--------|---------|
| Background | `color.surface`: `neutral.950` (#0D0D1F) | `#0D0D1F` | ✅ | All 9 screens use correct background |
| Brand gradient on icon box | `linear-gradient(135deg, #7C3AED, #EC4899)` | `linear(135,#7C3AED,#EC4899)` | ✅ | Applied to icon boxes (Frames 4, 63, 78, 93) |
| **Primary button gradient** | `linear-gradient(135deg, #7C3AED, #EC4899)` | `linear(135,#7C3AED,#7C3AED)` or `solid(#7C3AED)` | ⚠️ **HIGH** | Continue btn uses self-gradient (#7C3AED→#7C3AED); Create Account uses solid #7C3AED. Neither uses the purple→magenta brand gradient. |
| **Button border radius** | `rd(12)` | `rd(10)` | ⚠️ **HIGH** | All buttons use rd(10) which is the input radius token, not the button radius (rd(12)). |
| Input border radius | `rd(10)` | `rd(10)` | ✅ | All input fields use correct rd(10) |
| Input background | `color.surface.container` (dark variant) | `#1C1C30` | ✅ | Consistent across all screens |
| Input border (default) | `color.outline.variant` | `#2D2D45` | ✅ | Subtle border matches neutral-700 equivalent |
| Input border (error) | `color.error` / `red.500` / `#EF4444` | `#EF4444` | ✅ | Error borders consistently use red |
| Heading text | `color.text.primary`: `neutral.50` (#FFFFFF) | `#FFFFFF` | ✅ | All headings use white |
| Body text | `color.text.secondary`: `neutral.400` (#9CA3AF) | `#9CA3AF` | ✅ | Subtitle text uses correct secondary color |
| Error text | `color.error`: `red.500` (#EF4444) | `#EF4444` | ✅ | All error messages use error red |
| Disabled/placeholder text | `color.text.disabled`: `neutral.600` (#6B7280) | `#6B7280` | ✅ | Terms text and "Taking you to the app..." use correct color |
| "LIFEY" wordmark | `color.text.display`: `primary.300` (#A78BFA) | `#A78BFA` | ✅ | All instances use tertiary purple |
| "Log In" link | `color.text.display`: `primary.300` (#A78BFA) | `#A78BFA` | ✅ | Consistent link color |
| Font family | `Inter` | `Inter` | ✅ | All text uses Inter |
| Side padding | 24px | `pad(0,24)` | ✅ | All 9 screens use 24px side padding |
| Text hierarchy | Headings #FFF bold, body #D1D5DB, secondary #9CA3AF | Body shows #9CA3AF (matches secondary, not #D1D5DB) | ⚠️ **LOW** | Minor — body text uses `#9CA3AF` which is `color.text.secondary`. The rule says body should be `#D1D5DB`, but using secondary gray for subtitles is a defensible design choice. |
| Error message text size | — | `Inter,13,r` | ⚠️ **LOW** | Error messages use 13px which isn't a standard token size (12=xs, 14=sm, 16=md). Minor. |
| "Code accepted" text | — | `Inter,13,r,#9CA3AF` | ⚠️ **LOW** | Also uses 13px non-token size |
| Eye toggle icon | — | SVG path via `#9CA3AF` stroke | ✅ | Phosphor-style eye icon at appropriate 24×24 |

**Verdict:** ⚠️ **2 HIGH issues** — button gradient and border radius deviate from design system tokens.

---

## 3. Cross-Screen Consistency

| Pattern | Check | Status | Details |
|---------|-------|--------|---------|
| **Heading weight** | Compare all 3 primary screens | ⚠️ **HIGH** | "Join LIFEY" (Welcome) = **28px regular**, "Create your account" (Sign-Up) = **28px bold**, "Account created!" (Account Created) = **28px regular**. All three are primary screen headings but use different weights. |
| **Button styling** | Welcome default vs Sign-Up default | ⚠️ **MEDIUM** | Welcome Continue button: `linear(135,#7C3AED,#7C3AED)` self-gradient. Sign-Up Create Account: `solid(#7C3AED)`. Visually near-identical but implemented differently. Both lack the brand purple→magenta gradient. |
| **Button size** | All screens | ✅ | All buttons are `s(fill,52)` — consistent height and width behavior |
| **Button radius** | All screens | ✅ | All use rd(10) — consistent (even if wrong per design system) |
| **Button disabled state** | Error variants | ✅ | All error variant buttons use `o(0.50)` (50% opacity) to indicate disabled state |
| **Input field styling** | All screens | ✅ | All inputs use `#1C1C30` bg, `#2D2D45` border (default) or `#EF4444` (error), `rd(10)` — consistent |
| **Input labels** | All screens | ✅ | Labels use `Inter,14,m,#FFFFFF` with `s(fill,hug)` — consistent across all fields |
| **Input height** | All screens | ✅ | All inputs are `s(fill,48)` — consistent |
| **Spacing from top** | All 3 rows | ✅ | Y positions: 0, 960, 1920 — consistent row spacing |
| **Top content spacing** | Welcome default, Sign-Up default | ✅ | Icon→40px→heading→32px→input → consistent internal rhythm |
| **Back button** | Sign-Up default + variants | ✅ | All use same 36×36 circle with chevron path at `#9CA3AF` |
| **"Code accepted" badge** | Sign-Up default + variants | ✅ | All use same `#1C1C30` bg with green checkmark + "Code accepted" text |
| **"Already have an account? Log In"** | Welcome default + variants | ✅ | Present on all 4 Welcome screens |
| **Terms text bottom padding** | Sign-Up default vs error variants | ⚠️ **LOW** | Default uses `pad(0,0,32,0)` on terms container, error variants use `pad(16,0,32,0)` — extra 16px left padding on variants |
| **Success indicator (Account Created)** | Account Created | ✅ | Green checkmark in emerald circle, loading dots, "Taking you to the app..." |
| **Letter-spacing on LIFEY wordmark** | All instances | ✅ | `ls(-1px)` consistently applied to all "LIFEY" wordmark text |

**Verdict:** ⚠️ **1 HIGH, 1 MEDIUM, 1 LOW** — heading weight inconsistency is the most noticeable issue.

---

## 4. Scope Boundary

**Story:** EP0002-ST0001 — Sign Up with Invite Code and Password
**Epic:** EP0002 — User Authentication
**Out of scope (from epic):** Google OAuth, Apple OAuth, MFA, account deletion, role-based permissions

| Finding | Status |
|---------|--------|
| Only 3 screen types designed: Welcome (4 variants), Sign-Up (4 variants), Account Created | ✅ |
| No OAuth buttons (Google/Apple) present on any screen | ✅ |
| No MFA screens or elements | ✅ |
| No account deletion flow | ✅ |
| No role-based permissions UI | ✅ |
| No login screen (ST0002) — correctly deferred | ✅ |
| No profile screen (ST0004) — correctly deferred | ✅ |
| No password reset screen (ST0005) — correctly deferred | ✅ |
| All designed elements serve EP0002-ST0001 ACs or support the defined flow | ✅ |

**Verdict:** ✅ Scope perfectly respected. No out-of-scope screens or elements.

---

## 5. Visual Quality

| Check | Status | Details |
|-------|--------|---------|
| Frame dimensions | ✅ | All outer frames: `s(390,844)` with `clip` and `rd(40)` |
| No width overflow | ✅ | Content area = 342px (390 - 2×24 padding). All text fits within. |
| Fill spacers for CTA positioning | ✅ | Welcome: Frame 2 + Frame 15 push content. Sign-Up: Frame 43 pushes button. Account Created: Frame 48 + Frame 59 center content. |
| Text wrapping | ✅ | Multi-line text uses `s(fill,hug)` with explicit `\n` line breaks |
| No collapsed frames | ✅ | All fill spacers have fixed-height ancestors (844px frame) |
| Buttons at bottom | ✅ | CTAs are pushed to bottom by fill spacers before them |
| No phone chrome | ✅ | No status bar, battery icon, signal bars, or home indicator on any screen |
| Contrast check | ✅ | White #FFF headings on #0D0D1F bg pass. Secondary #9CA3AF on #0D0D1F passes. Error #EF4444 on #0D0D1F passes. Terms #6B7280 on #0D0D1F — lighter than ideal but meets WCAG AA for 14px+ text. |
| Corner radius consistency | ✅ | rd(40) on outer frame, rd(16) on icon box, rd(10) on all inputs and buttons (consistent even if incorrect per DS) |
| No visual clipping | ✅ | All elements use auto-layout with appropriate sizing |
| Eye toggle icon | ✅ | 24×24 SVG eye icon positioned at right edge of Password input |
| Loading dots animation | ✅ | 3× 8px circles at varying opacity (40%, 70%, 100%) — correct animation pattern |
| Logo icon detail | ✅ | "L" + stylized "i" inside 56×56 gradient box with rd(16) |
| Hardcoded line breaks | ⚠️ LOW | "Enter your invite code to\ncreate an account" uses `\n` — works on all screens but text reflow won't adapt to dynamic content. Acceptable for static copy. |
| Error text layout | ✅ | Error appears below its associated input field with 12px gap before, uses `s(fill,hug)` for proper wrapping |
| Password input visibility toggle | ✅ | Eye icon (Frame 31) correctly placed at x=306 in the password field |

**Verdict:** ✅ Clean visual quality. Minor note on hardcoded line breaks but acceptable for static copy.

---

## 6. Canvas Layout Compliance

| Rule | Status | Details |
|------|--------|---------|
| Different screen types stacked vertically | ✅ | Row 1 (Y=0): Welcome, Row 2 (Y=960): Sign-Up, Row 3 (Y=1920): Account Created |
| Same-screen variants arranged horizontally | ✅ | Welcome variants at X=430/860/1290; Sign-Up variants at X=430/860/1290 |
| Default screen is leftmost | ✅ | Each row's first element is the default (no error) state |
| Variant spacing: 390px width + 40px gap | ✅ | Variants at X=430, 860, 1290 (= 390n + 40(n-1)) |
| Row gap ≥ 40px minimum | ✅ | Row 2 at Y=960 (Row 1 bottom = 844 → gap = 116px). Row 3 at Y=1920 (Row 2 bottom = 1804 → gap = 116px). Both exceed 40px minimum. |
| Frame names are descriptive | ✅ | "Welcome Screen", "Sign-Up Screen", "Account Created Screen", "Welcome - Invalid Code Error", etc. |

**Verdict:** ✅ Canvas layout fully compliant with `frontend-structure.md` conventions.

---

## Overall Verdict

| Dimension | Status |
|-----------|--------|
| AC-to-Design Traceability | ✅ All 12 ACs covered |
| Design System Compliance | ⚠️ 2 HIGH, 2 LOW |
| Cross-Screen Consistency | ⚠️ 1 HIGH, 1 MEDIUM, 1 LOW |
| Scope Boundary | ✅ Perfect |
| Visual Quality | ✅ Clean |
| Canvas Layout Compliance | ✅ Compliant |

### Issues Summary

| # | Severity | Screen(s) | Element | Issue | Fix Recommendation |
|---|----------|-----------|---------|-------|-------------------|
| 1 | **HIGH** | All screens | All buttons (Frames 14, 44, 72, 87, 102, 125, 147, 169) | Button border radius is `rd(10)` instead of `rd(12)` per design system token | Change button radius to `rd(12)` on every button frame |
| 2 | **HIGH** | All screens | Continue button (Frame 14), Create Account button (Frame 44), all variant buttons | Buttons use solid `#7C3AED` or self-gradient instead of brand gradient `linear(135,#7C3AED,#EC4899)` | Apply the purple→magenta brand gradient to all primary action buttons |
| 3 | **HIGH** | Welcome Screen (default), Account Created Screen | "Join LIFEY" heading (Text 4), "Account created!" heading (Text 22) | Headings use regular weight (Inter,28,r) while Sign-Up uses bold (Inter,28,b) | Change to bold weight (Inter,28,b) to match "Create your account" and `typography.h1` token |
| 4 | **MEDIUM** | Sign-Up Screen (default) | Terms text container (Frame 46) vs variants (Frames 126, 148, 170) | Default uses `pad(0,0,32,0)` on terms container; error variants use `pad(16,0,32,0)` | Align to either `pad(0,0,32,0)` (default preferred) or `pad(16,0,32,0)` across all |
| 5 | **LOW** | All screens | Error messages, "Code accepted" badge | Uses non-token font size 13px instead of standard sizes (12=xs, 14=sm) | Consider using 14px (sm) or 12px (xs) to stay on token scale |
| 6 | **LOW** | Welcome Screen | Subtitle text | "Enter your invite code to\\ncreate an account" uses hardcoded `\n` break | Consider `s(fill,hug)` with natural text wrapping if dynamic content is expected |

### ⏳ CONDITIONAL PASS

**Fix the 4 issues above (3 HIGH, 1 MEDIUM) before handing off to dev-agent:**

1. **🔴 Button border radius:** Change from `rd(10)` → `rd(12)` on all buttons (8 frames across all screens)
2. **🔴 Button gradient:** Apply brand gradient `linear(135,#7C3AED,#EC4899)` to all primary action buttons instead of solid/single-color fills
3. **🔴 Heading weight consistency:** Change "Join LIFEY" and "Account created!" from regular (400) to bold (700) to match "Create your account"
4. **🟡 Terms text padding:** Align the default Sign-Up terms container padding with the error variants (prefer `pad(0,0,32,0)` for consistency)

After fixes, re-verify and mark ✅ **APPROVED**.
