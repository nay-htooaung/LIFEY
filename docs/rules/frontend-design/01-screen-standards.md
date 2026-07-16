# Screen Design Standards

> Maintained by frontend-designer. Covers layout, spacing, and structural
> conventions for all LIFEY screens.

## Screen Canvas

- **Dimensions:** 390×844px (mobile-first form factor)
- **Corner radius:** `rd(40)` with `clip` on the outer frame
- **Background:** `#0D0D1F` (dark theme)
- **Outer frame sizing:** `s(390,844)` — never `s(390,hug)`
- **No phone chrome.** Screens contain only app UI — no status bar (9:41, signal, battery), home indicator, or other device mockup elements.

## Layout Hierarchy (top to bottom)

Each screen follows this structure:

1. **Navigation** — Back button (← + "Back") or header with title + "Done"/"Cancel"
2. **Spacer** — `s(fill, 24)` or `s(fill, 32)` between sections
3. **Header** — Title (22–26px, bold, white) + description (14–15px, `#9CA3AF`)
4. **Content** — Flex area with `s(fill,fill)` spacer to push CTAs to bottom
5. **Primary action** — Solid gradient (`linear-gradient(135deg, #7C3AED, #EC4899)`) button, 48px height, 10px radius
6. **Secondary action** — Ghost/outline variant with `#374151` border

## Spacer Pattern

Use fixed-height spacers between sections:

| Spacer | Height | Purpose |
|--------|--------|---------|
| Nav → header | `s(fill, 24)` | After back button row |
| Header → content | `s(fill, 32)` | After title/subtitle |
| Content → CTA | `s(fill, fill)` | Push button to bottom (needs 844 fixed parent) |
| CTA → bottom | `s(fill, 8)` | Bottom safe margin |

## Text Styles

| Role | Size | Weight | Color |
|------|------|--------|-------|
| Page title | 24–26px | Bold (700) | `#FFFFFF` |
| Description | 15px | Regular (400) | `rgba(255,255,255,0.5)` |
| Label / Field label | 13px | Medium (500) | `rgba(255,255,255,0.7)` |
| Button text | 16px | Semi-bold (600) | `#FFFFFF` |
| Secondary text | 14px | Regular (400) | `rgba(255,255,255,0.4)` |
| Accent / Link | 14px | Medium (500) | `#A78BFA` |
| Destructive | 14px | Medium (500) | `#EF4444` |


## Buttons

| Type | Style |
|------|-------|
| Primary | `background: #7C3AED`, `border-radius: 12px`, `padding: 16px`, white text |
| Disabled primary | Same + `opacity: 0.5` |
| Secondary | `border: 1px solid rgba(255,255,255,0.1)`, `border-radius: 12px`, `padding: 16px`, muted text |
| Text link | No border, accent color `#A78BFA` |

## Input Fields

- Height: `52px`
- Background: `rgba(255,255,255,0.05)`
- Border: `1px solid rgba(255,255,255,0.15)`
- Radius: `12px`
- Padding: `0 16px`
- Disabled: `rgba(255,255,255,0.03)` bg + `rgba(255,255,255,0.08)` border

## Code Entry

Both invite code and OTP/reset code inputs use inline frames. A component master for Code Cell exists in the component library but is not currently instanced on screens (screens use inline frames directly).

- **Cell size:** `52×56px`
- **Layout:** 6 cells in an `al(h,g(6))` row — total width 342px (fits 390−48 padding)
- **Default styling:** `rgba(255,255,255,0.05)` fill, `1px solid rgba(255,255,255,0.15)` stroke
- **Active / filled styling:** `#7C3AED` fill + stroke
- **Text:** Inter 20px, semi-bold, white, center-aligned

## Component Masters

All component masters live on the right side of the `Lifey` canvas, grouped by category (`p(1760, 0)` onwards):

| Category | Component | Position |
|----------|-----------|----------|
| **Inputs** | Code Cell | `p(1760,30)` |
| **Buttons** | Primary Button | `p(1760,190)` |
| **Buttons** | Back Button | `p(1760,260)` |
| **Buttons** | Ghost Link Row | `p(1760,310)` |
| **Buttons** | Brand Header | `p(1760,350)` |
| **Navigation** | Back Nav | `p(1760,440)` |
| **Navigation** | Top App Bar | `p(1760,480)` |
| **Feedback** | Error Message | `p(1760,620)` |
| **Feedback** | Success Toast | `p(1760,660)` |
| **Feedback** | Error Toast | `p(1760,710)` |
| **Feedback** | Loading State | `p(1760,760)` |

- Use `inst(<component-id>)` to instance a master on a screen
- Use `override()` to customize text/props per instance
- When designing new screens, check the component masters first before creating new elements
- If a new reusable pattern emerges, add a `comp` master to the appropriate category
