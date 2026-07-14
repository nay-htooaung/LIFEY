---
title: UI Component Strategy — shadcn/ui + Radix
status: Accepted
date: 2026-07-14
deciders: [tech-lead]
---

# ADR-0003: UI Component Strategy — shadcn/ui + Radix

## Context

The application needs a UI component library for building the interface efficiently. The frontend stack already commits to **React** with **TypeScript** and **Tailwind CSS** (via ADR-0002). We now need to decide how to build the UI — from semantic HTML with Tailwind utility classes alone, or with a component library providing accessible, pre-built primitives.

Key constraints:
- Must pair well with Tailwind CSS (already a firm decision)
- Must produce accessible components (keyboard nav, screen readers, ARIA) with minimal extra effort
- Must support the "PWA installable" goal — small bundle, no unnecessary dependencies
- Must allow customisation to LIFEY's design system (colours, spacing, typography) without fighting the library
- Should be well-supported in the ecosystem and easy to hire for

## Options

### Option A: shadcn/ui + Radix Primitives
Components are **not a dependency** — they are copy-pasted as source files into the project (`/components/ui/`) and fully customisable. Each component wraps a **Radix** headless primitive (`Dialog`, `DropdownMenu`, `Popover`, `Tabs`, etc.) and composes it with Tailwind utility classes.

### Option B: Mantine
Full-component library (300+ components) with its own styling engine and theming system. Install via npm, import directly. Includes hooks and utilities beyond UI components.

### Option C: Custom components from scratch
Build every UI element (button, modal, dropdown, tabs, input, etc.) as a custom React component styled with Tailwind classes. No third-party UI library.

## Evaluation

| Criteria | shadcn/ui + Radix | Mantine | Custom |
|----------|:---:|:---:|:---:|
| **Accessibility** | ✅ Built on Radix (WAI-ARIA certified) | ✅ Good a11y out of the box | ⚠️ Must be built and maintained manually |
| **Tailwind integration** | ✅ Native — components ARE Tailwind classes | ⚠️ Requires custom theme adapter | ✅ Natural |
| **Customisability** | ✅ Full source control — change anything | ⚠️ Themed via Mantine provider, harder to override deeply | ✅ Full control |
| **Bundle size** | ✅ Only the components you copy (minimal) | ❌ ~150 kB minified minimum | ✅ Zero library overhead |
| **Time to UI** | ✅ Fast — copy, paste, tweak | ✅ Fast — import and use | ❌ Slow — every component from scratch |
| **Ecosystem / hiring** | ✅ Dominant pattern in 2025–26 React | ⚠️ Niche — smaller community | ✅ Any React developer can work with it |
| **Upgrade risk** | ✅ Not a dependency — no "breaking upgrade" problem | ❌ Breaking changes on major versions | ✅ N/A |
| **Design system fit** | ✅ Tokens replace directly in source | ⚠️ Must map tokens to Mantine theme | ✅ Full flexibility |

## Decision

**Accepted: Option A — shadcn/ui + Radix Primitives**

The combination of zero-dependency copy-paste, first-class Tailwind support, and Radix's battle-tested accessibility makes shadcn/ui the clear winner for a mid-sized SPA. It avoids library lock-in (components are our source files), keeps the bundle lean (no unused components shipped), and gives us full visual control — exactly what LIFEY needs as it develops its own design system.

## Consequences

### Positive
- Every component can be customised without fighting the library — they're just `.tsx` files in our repo
- No dependency risk from library upgrades (we own the source)
- Smallest possible bundle since only used components exist in the project
- Easy to onboard: any developer comfortable with React + Tailwind can work with shadcn/ui
- Radix primitives handle complex accessibility (modals, popovers, dropdowns, tabs) correctly by default

### Negative
- Updates to shadcn/ui's upstream patterns are manual — we must diff and copy if we want the latest improvements
- Slightly more boilerplate than an installed library (copy-paste per component)
- No bundled utilities like Mantine's hooks — we use Zustand + TanStack Query separately for state

### Neutral
- The team should adopt the [shadcn/ui New York style](https://ui.shadcn.com/themes) as the base, then override tokens with LIFEY's design tokens
- `npx shadcn@latest add <component>` workflow for initial component installs

## Compliance

- All new UI elements must use shadcn/ui components where an appropriate primitive exists (button, input, dialog, dropdown, tabs, etc.)
- Exceptions require a comment explaining why (e.g., a one-off element that doesn't benefit from the pattern)
- Components in `src/components/ui/` are managed via the `shadcn` CLI — avoid manual edits in the component files unless necessary (customisations go in `tailwind.config.ts` or theme tokens)
- Run `pnpm dlx @shadcn/ui@latest update` periodically to review upstream changes

## Supersedes

None.
