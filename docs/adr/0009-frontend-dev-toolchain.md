---
title: Frontend Development Toolchain — Testing, Linting, Formatting, and Forms
status: Accepted
date: 2026-07-14
deciders: [tech-lead]
---

# ADR-0009: Frontend Development Toolchain — Testing, Linting, Formatting, and Forms

## Context

The frontend stack is already established (React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Zustand) across ADRs 0002–0008. What remains is the **development toolchain**: how we test, lint, format, type-check, and handle forms.

Key constraints:
- The CI file (`.github/workflows/ci.yml`) references `eslint`, `prettier`, `tsc`, and `vitest` — these should be the defaults unless there's a strong reason to diverge
- The target is a **PWA SPA** — minimal bundle size and fast builds matter
- shadcn/ui's `Form` component wraps **React Hook Form** + **zod** natively — choosing anything else means fighting the default
- TypeScript strict mode is already mandated by ADR-0002
- Solo/small team — toolchain should be simple, convention-over-configuration, and require minimal maintenance

## Options

### Frontend Testing

| Option | Description |
|--------|-------------|
| **A — Vitest + Testing Library** | Vite-native test runner. Same config as Vite (transform, resolve). Built-in watch mode. `@testing-library/react` for component tests. |
| **B — Jest** | Legacy standard. Requires separate config from Vite (`jest.config.ts` with `ts-jest` or `@swc/jest`). Slower because it doesn't share Vite's transform pipeline. |
| **C — Playwright Component Tests** | Browser-level component testing. Closer to real user interaction but significantly slower and more complex setup for unit-level tests. |

### Linting & Formatting

| Option | Description |
|--------|-------------|
| **A — ESLint + Prettier** | ESLint for code quality rules, Prettier for formatting. Industry standard for TypeScript/React. CI file already expects these. |
| **B — Biome** | All-in-one linter + formatter in Rust. Fast (10-100x faster than ESLint). Replaces both ESLint and Prettier. Growing ecosystem but newer and fewer React-specific rules. |
| **C — dprint** | Pluggable code formatter in Rust. Fast but not a linter — must pair with ESLint. Less ecosystem support than Prettier. |

### Form Handling

| Option | Description |
|--------|-------------|
| **A — React Hook Form + zod** | RHF manages form state with uncontrolled inputs (fewer re-renders). zod provides schema validation. shadcn/ui's `Form` component is built on this pair. |
| **B — Formik + Yup** | Older but mature. More re-renders (controlled inputs). Larger bundle. shadcn/ui does not natively support Formik. |
| **C — Native `useState` + manual validation** | No dependencies. Manual input handling, validation, and error state. Tedious for any form with more than 2-3 fields. |

## Evaluation

### Testing

| Criteria | A — Vitest + Testing Library | B — Jest | C — Playwright CT |
|----------|:---:|:---:|:---:|
| **Vite integration** | ✅ Native (shares config) | ❌ Separate config | ❌ Separate build |
| **Speed (watch mode)** | ✅ Instant HMR | ⚠️ Slower | ❌ Slow (browser) |
| **Component testing** | ✅ Testing Library | ✅ Testing Library | ✅ Real browser |
| **Bundle impact** | ✅ Dev only | ✅ Dev only | ✅ Dev only |
| **CI file expectation** | ✅ Already referenced | ❌ | ❌ |
| **Ecosystem** | ✅ Dominant in 2025-26 | ⚠️ Legacy | ⚠️ Niche for components |

### Linting & Formatting

| Criteria | A — ESLint + Prettier | B — Biome | C — dprint |
|----------|:---:|:---:|:---:|
| **Speed** | ⚠️ Adequate (~2-3s on a project this size) | ✅ Very fast (~100ms) | ✅ Very fast |
| **React/TS rules** | ✅ Vast plugin ecosystem (`eslint-plugin-react-hooks`, `@typescript-eslint`) | ⚠️ Growing but fewer | ❌ Not a linter |
| **CI file expectation** | ✅ Already configured | ❌ Not referenced | ❌ Not referenced |
| **Configuration** | ⚠️ `.eslintrc` + `.prettierrc` (two files) | ✅ Single `biome.json` | ⚠️ `.dprint.json` + ESLint |
| **Auto-fix** | ✅ `--fix` | ✅ `apply` | ✅ N/A (formatter only) |
| **Migration effort** | ✅ None — CI already expects it | ⚠️ Must rewrite CI config | ❌ Must install, config, rewrite CI |

### Form Handling

| Criteria | A — RHF + zod | B — Formik + Yup | C — Native |
|----------|:---:|:---:|:---:|
| **shadcn/ui compatibility** | ✅ Native (Form wraps RHF) | ❌ Manual integration | ❌ Must build from scratch |
| **Bundle size** | ✅ ~12 KB (RHF + zod) | ⚠️ ~20 KB (Formik + Yup) | ✅ Zero |
| **Performance** | ✅ Uncontrolled — minimal re-renders | ❌ Controlled — re-renders on every keystroke | ⚠️ Depends on implementation |
| **Validation power** | ✅ Zod schemas (type-safe, composable) | ✅ Yup schemas (similar) | ❌ Manual |
| **DX — complex forms** | ✅ useFieldArray, watch, touched | ⚠️ FieldArray is complex | ❌ Tedious |
| **TypeScript integration** | ✅ Zod infers types natively | ⚠️ Yup + infer | ❌ Manual types |

## Decision

### Accepted — Testing: Vitest + Testing Library

Vitest is the natural choice: it shares Vite's config, transform pipeline, and plugin ecosystem. The CI file already expects `vitest run`. Testing Library provides accessible-by-default query patterns (`getByRole`, `findByText`) that align with the story-level acceptance criteria.

### Accepted — Linting & Formatting: ESLint + Prettier

Although Biome is objectively faster, the CI file already references ESLint and Prettier. The migration effort isn't justified for a solo/small project at this stage. The ESLint + Prettier ecosystem is battle-tested, well-documented, and has the richest set of React/TypeScript-specific rules. This decision can be revisited (via a new ADR) if build times become a bottleneck.

### Accepted — Form Handling: React Hook Form + zod

This is the path of least resistance: shadcn/ui's `Form` component is built on RHF + zod. Choosing anything else would require either building a custom form system or fighting shadcn/ui's patterns. RHF's uncontrolled approach also aligns with the PWA performance goal (fewer re-renders).

## Consequences

### Positive
- **Vitest** shares Vite config — no separate test config file, faster startup, same aliases/plugins
- **Testing Library** encourages accessible queries — components are tested the way users interact with them
- **ESLint + Prettier** are zero-config for this project (CI already expects them) — just `npm install` and use existing configs
- **React Hook Form + zod** means forms are type-safe end-to-end: the zod schema defines the shape AND the validation rules AND the TypeScript type
- shadcn/ui's `<Form>` component works out of the box — no adapter needed

### Negative
- **ESLint + Prettier** is two tools to configure instead of one (Biome). The `--check` step in CI adds ~2-3s per build
- **Testing Library** queries can be verbose (`screen.getByRole('button', { name: /submit/i })`) — team must learn the pattern
- **React Hook Form + zod** adds ~12 KB to the initial bundle (but only on pages with forms, and code-splitting minimises impact)

### Neutral
- Team must learn Vitest API (similar to Jest, but with `vi` instead of `jest`)
- ESLint config should use the `typescript-eslint` flat config (v8+) with the `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` plugins
- Prettier config: single quotes, trailing commas, 100 char width (consistent with existing codebase conventions)
- Zod schemas should be co-located with their form components in `src/features/*/schemas/` or inline for simple forms

## Compliance

### Testing
- Every query must use Testing Library's accessible queries (`getByRole`, `findByText`) before falling back to `data-testid` — enforce via ESLint `eslint-plugin-testing-library`
- Component tests must render the component, not test implementation details (no `expect(state)` — test the DOM output)
- Run `vitest run` before every commit (pre-commit hook via `lint-staged`)

### Linting & Formatting
- ESLint must extend `eslint:recommended`, `plugin:@typescript-eslint/strict-type-checked`, `plugin:react-hooks/recommended`
- Prettier must be configured with `{ "singleQuote": true, "trailingComma": "all", "printWidth": 100 }`
- CI runs `eslint . && prettier --check .` before type-checking and tests
- `eslint --fix` and `prettier --write` must be run before committing (pre-commit hook)

### Forms
- Every form must use React Hook Form + zod — no bare `useState` for form state
- Zod schemas must define both runtime validation AND inferred TypeScript types (via `z.infer`)
- Form error messages must match the shadcn/ui `FormMessage` pattern
- Simple forms (1-2 fields, no validation beyond required) MAY use native for simplicity, documented in a comment

## References

- [ADR-0002](0002-installable-spa-architecture.md) — TypeScript strict mode
- [ADR-0003](0003-ui-component-strategy.md) — shadcn/ui component strategy (Form component)
- CI file: `.github/workflows/ci.yml` — references vitest, eslint, prettier, tsc
