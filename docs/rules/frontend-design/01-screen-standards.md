# Screen Design Standards

> Maintained by frontend-designer. Covers layout, spacing, and structural
> conventions for all LIFEY screens.

## Phone Mockup

- **Dimensions:** 390×844px (iPhone 14/15/16 Pro form factor)
- **Corner radius:** `border-radius: 40px` on the outer frame
- **Background:** `#0D0D1F` (dark theme)
- **Padding:** `40px` top, `24px` left/right
- **Outer frame sizing:** `s(390,844)` — never `s(390,hug)`

## Layout Hierarchy (top to bottom)

Each screen follows this structure:

1. **Status bar** — `space-between` row, `9:41` left + signal icons right
2. **Navigation** — Back button (← + "Back") or header with title + "Done"/"Cancel"
3. **Spacer** — `s(fill, 32)` or `s(fill, 40)` between sections
4. **Header** — Title (22–26px, bold, white) + description (15px, `rgba(255,255,255,0.5)`)
5. **Content** — Flex area with `s(fill,fill)` spacer to push CTAs to bottom
6. **Primary action** — Solid purple (#7C3AED) button, 16px padding, 12px radius
7. **Secondary action** — Ghost/outline variant with `rgba(255,255,255,0.1)` border
8. **Home indicator** — Centered `134px × 5px`, `rgba(255,255,255,0.15)`, `border-radius: 100px`

## Spacer Pattern

Use fixed-height spacers between sections:

| Spacer | Height | Purpose |
|--------|--------|---------|
| Status → nav | `s(fill, 32)` | After status bar |
| Nav → content | `s(fill, 40)` | After back button |
| Content → CTA | `s(fill, fill)` | Push button to bottom (needs 844 fixed parent) |
| CTA → home indicator | `s(fill, 48)` | Before home indicator |

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
| Status bar | 12px | Regular (400) | `rgba(255,255,255,0.4)` |

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

## Code Entry (Invite-style)

- 6 individual cells, each `52×56px`
- Gap between cells: `6px` (total: 52×6 + 5×6 = 342px, fits 390−48 padding)
- Inactive: `rgba(255,255,255,0.05)` bg + `rgba(255,255,255,0.15)` border
- Active / filled: `#7C3AED` bg + border
