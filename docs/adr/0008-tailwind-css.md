---
title: Styling Approach — Tailwind CSS
status: Accepted
date: 2026-07-14
deciders: [tech-lead]
---

# ADR-0008: Styling Approach — Tailwind CSS

## Context

The SPA needs a styling system for building the user interface. The decision affects every component in the app — how colours, spacing, typography, and responsiveness are expressed in code.

Key constraints:
- Must pair well with **shadcn/ui** (already chosen per ADR-0003), which is built on Tailwind utility classes
- Must support a **design system** (colour tokens, spacing scale, type scale) that can be shared across components
- Must produce **small CSS bundles** — the PWA installable goal means minimising shipped bytes
- Must avoid runtime cost — CSS should be resolved at build time, not in the browser
- Developer experience matters — fast feedback, no configuration overhead for new components

## Options

### Option A: Tailwind CSS
Utility-first framework. Styles are composed from predefined classes (`px-4`, `text-lg`, `bg-blue-500`). Custom design tokens go in `tailwind.config.ts`. CSS is purged at build time — only used classes ship.

### Option B: CSS Modules
CSS written in per-component `.module.css` files, imported as JavaScript objects (`import styles from './Button.module.css'`). Scoped by default.

### Option C: styled-components / Emotion
CSS-in-JS. Styles written as tagged template literals in `.tsx` files (`const Button = styled.button`). Runtime injection of styles.

### Option D: Vanilla CSS / PostCSS
Plain CSS files imported globally or per-component. Processed through PostCSS for nesting, autoprefixing, etc.

## Evaluation

| Criteria | Tailwind CSS | CSS Modules | styled-components | Vanilla CSS |
|----------|:---:|:---:|:---:|:---:|
| **Bundle size (prod)** | ✅ ~10 KB base + purged utilities | ✅ Per-component CSS, typically 20–50 KB | ❌ Runtime injection adds ~15 KB + style serialisation | ⚠️ Can grow unbounded without discipline |
| **Build-time resolution** | ✅ All unused classes purged | ✅ Static CSS files | ❌ Runtime — styles computed in browser | ✅ Static |
| **Design system tokens** | ✅ `tailwind.config.ts` — single source of truth | ⚠️ CSS custom properties or manual duplication | ⚠️ Theme provider, but serialised at runtime | ⚠️ CSS custom properties |
| **shadcn/ui compatibility** | ✅ Native — shadcn IS Tailwind classes | ❌ shadcn doesn't support CSS Modules | ❌ shadcn doesn't support CSS-in-JS | ❌ shadcn doesn't support vanilla CSS |
| **Developer velocity** | ✅ No context switching — style inline in markup | ⚠️ Switch between `.tsx` and `.module.css` | ✅ Style in component, but template literals get verbose | ❌ Naming conventions, file organisation |
| **Learning curve** | ⚠️ Utility class names must be learned | ✅ Plain CSS — minimal learning | ⚠️ Concepts (styled, attrs, theme) | ✅ Minimal |
| **Responsive design** | ✅ `sm:`, `md:`, `lg:` prefixes, no media query context switch | ⚠️ Media queries in CSS | ⚠️ Media queries or object syntax | ⚠️ Media queries |
| **Refactoring safety** | ⚠️ Classes are strings — no type checking | ✅ Scoped by default, no leak risk | ✅ Scoped by default | ❌ Global cascade |
| **Rename component** | ⚠️ Must find all class strings manually | ✅ CSS file travels with component | ✅ Styles attached to component | ❌ Styles may be anywhere |

## Decision

**Accepted: Option A — Tailwind CSS.**

Tailwind is the pragmatic choice for this project because it is the foundation that **shadcn/ui is built on**. Choosing anything else would mean either fighting shadcn/ui's output or rewriting every component from scratch. Beyond compatibility, Tailwind's utility-first approach produces the smallest CSS bundle (purged at build time), enforces design consistency via the config file, and eliminates context-switching during UI development.

## Consequences

### Positive
- shadcn/ui components work out of the box — they are Tailwind classes
- CSS bundle is automatically purged — only used utilities are shipped (typically ~10 KB for a mid-size app)
- Design tokens (colours, spacing, typography, breakpoints) live in one file: `tailwind.config.ts`
- Responsive design uses inline breakpoint prefixes — no separate media query blocks
- Fast onboarding for developers familiar with React — Tailwind is the dominant styling approach in the React ecosystem (2025–26)

### Negative
- JSX can become dense with long class strings — mitigated by extracting repeated patterns into components
- Utility class names are an API to learn — team must be familiar with Tailwind's naming conventions
- Design token changes require a rebuild (no runtime theming) — acceptable since LIFEY doesn't need runtime theme switching yet

### Neutral
- Use `tailwind.config.ts` with the `theme.extend` pattern for custom tokens (brand colours, spacing overrides)
- CSS `@apply` directive should be avoided — it defeats the purpose of utility classes and can cause specificity issues
- Dark mode is marked as deferred in the epic; when implemented, Tailwind's `dark:` variant makes it straightforward
- PostCSS is still in the build pipeline for nesting and autoprefixing (Vite includes it by default)

## Compliance

- All styling MUST use Tailwind utility classes — no custom CSS files except for overrides that cannot be expressed in Tailwind (rare)
- Custom CSS files (if any) MUST use `@layer utilities` or `@layer components` to maintain specificity order
- Design tokens MUST be defined in `tailwind.config.ts` `theme.extend` — bare hex values in JSX are not allowed (enforce via PR review)
- `@apply` is forbidden — extract a component instead
- Run `npx tailwindcss init --ts` to generate the initial config
- Regular `pnpm dlx tailwindcss@latest update` to stay current

## References

- Tailwind CSS docs: https://tailwindcss.com/docs
- shadcn/ui theming guide: https://ui.shadcn.com/themes
- Tailwind + Vite: https://tailwindcss.com/docs/guides/vite
