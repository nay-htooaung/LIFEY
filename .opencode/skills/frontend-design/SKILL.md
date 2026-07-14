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
- [ ] Read `docs/design/Styles/default.styles` for canonical design tokens
- [ ] Load Brilliant knowledge (≥6 keys for DSL work)
- [ ] Confirm brief with user

## Local Design Assets

The `docs/design/` directory contains the project's design source of truth:

| Path | Contents | Editable? |
|------|----------|-----------|
| `docs/design/Styles/default.styles` | LIFEY design system tokens (colors, fonts, spacing, shadows) | ✅ Yes — update tokens here |
| `docs/design/Assets/` | Image assets (icons, logos, exported screenshots) | ✅ Yes — add assets here |
| `docs/design/Lifey/Auth.design` | Auth canvas blueprint (5 screens) | ❌ Never edit — Brilliant-managed |
| `docs/design/Lifey/Profile.design` | Profile canvas blueprint | ❌ Never edit — Brilliant-managed |
| `docs/design/Canvas.design` | Scratch canvas config | ❌ Never edit — Brilliant-managed |
| `docs/design/.brilliant/` | Brilliant internal data | ❌ Never edit — Brilliant-managed |

**Rule:** Never manually edit `.design` files, `Canvas.design`, or `.brilliant/`. These are managed by Brilliant's export/sync. Edit tokens in `Styles/default.styles` and add assets to `Assets/`.

## Brilliant Tool Quick Reference

### Creating screens (default path)

```python
# Phone mockup template
# Use $tokens from docs/design/Styles/default.styles when possible
brilliant_create_html(
  canvasId="Lifey/<Folder>",
  html="""<div style="... 390px, 844px, #0D0D1F ..." id="lifey-<name>">
    ...status bar, nav, content, buttons, home indicator...
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
- [ ] No content overflows parent width (max 342px)
- [ ] Fill spacers actually push content (not collapsed in hug parent)
- [ ] Text that wraps has `s(fill,hug)`
- [ ] Buttons at bottom of screen (pushed by fill spacer)
- [ ] Color contrast: secondary text at 0.5 opacity minimum
- [ ] Consistent padding: 40px top, 24px sides
- [ ] Frame has a descriptive name (not "Frame 1")
- [ ] Session file updated with new screen
- [ ] Token values match `docs/design/Styles/default.styles`

## Handoff to Dev Agent

When designs are approved:

1. Note which story AC each screen maps to
2. Document any component specs (spacing, states, variants)
3. If new design tokens are needed, update `docs/design/Styles/default.styles` and notify tech-lead via ADR
