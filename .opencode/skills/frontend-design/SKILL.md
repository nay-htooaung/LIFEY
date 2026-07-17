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
- [ ] Read `.opencode/frontend-session.md` — current session context
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

## Handoff to Dev Agent

When designs are approved:

1. Note which story AC each screen maps to
2. Document any component specs (spacing, states, variants)
3. If new design tokens are needed, update `docs/design/Styles/default.styles` and notify tech-lead via ADR
