# Lifey: notes for coding agents

Lifey is a household money PWA (Japanese and English) for a person and the people they live with.
README.md covers setup; this file is the rules and decisions every session needs.

## Rules

- Stack: React 19 + TypeScript + Vite + vite-plugin-pwa, Supabase (Postgres + RLS). No router, no CSS framework.
- Before committing, run `npm run typecheck && npm test && npm run build && npm run test:db`.
- Money is whole yen (integers). Dates are local `YYYY-MM-DD` strings (`src/domain/dates.ts`).
- Balances and card statements are always derived from entries/flows, never stored.
- Privacy lives in the database: change `supabase/migrations/*` and extend `supabase/tests/privacy_test.sql` together.
  Add a new migration file rather than editing one that has been applied.
- Every user-facing string goes through `t()`; add the key to both `src/i18n/en.ts` and `ja.ts`.
- Colours come from tokens in `src/styles/themes.css`; never hard-code a colour in a component.
- UI copy: plain, short, active voice. Shared spaces are called "space" / スペース (the DB kind is still `household`).
- Nothing is hard-deleted: sources and methods are `archived`, members get `left_at`, spaces get `deleted_at`.
  Each can be restored, and rejoining or restoring brings the data back.
- Only run SQL against Supabase when a task cannot be done another way (e.g. creating an invite code), and say why.
  Check migrations and deploys through the CI log instead.
- Do not touch prod (`lifey-prod`) and do not open or merge a PR to `main` unless the user asks.
  The user releases to prod themselves at v1.0.0.

## Environments and deploy

| | dev | prod |
| --- | --- | --- |
| Branch | any except `main` (work happens on `rebuild/money-mvp`) | `main` |
| Supabase | `lifey-dev` `uezezkydnlbksrqvaipr` | `lifey-prod` `klxhdsravxkprqxdgebv` |
| Site | https://lifey-dev.naytech001.workers.dev | Worker `lifey` (not deployed yet) |

- `.github/workflows/deploy.yml` runs on every push: `node scripts/migrate.mjs <ref>` applies pending migrations
  through the Supabase Management API (only `SUPABASE_ACCESS_TOKEN` is needed; GitHub runners cannot reach the
  IPv6-only database), then builds and deploys to Cloudflare. Refs, URLs and publishable keys are public and live in the workflow.
- Prod has only migrations `20261023000000` and `20261023010000`; the rest arrive with the first merge to `main`.
- `main` still holds the old app (July, `frontend/`+`backend/`, Tailwind), as do the `story/*` branches.
  Merging `rebuild/money-mvp` replaces it.
- Sign-up is invitation only: `select public.create_signup_invite('note', days);` in the SQL editor (README).
- Parallel sessions may work on their own branches (`ccr-*`) cut from `rebuild/money-mvp`. Before adding a
  migration, `git fetch` and pick a timestamp later than any migration on any branch, so two never collide.

## Architecture and decisions

- `src/data/repo.ts` is the storage interface; `cloud.ts` (Supabase) and `demo.ts` (localStorage, no Supabase
  settings) implement it. `store.tsx` holds the snapshot.
  - `load()` returns this month's entries plus repeating templates and their copies; `loadMonth()` fetches
    other months on demand (History).
  - `useSubmit()` is the only way to save from a component. The tapped button gets `aria-busy` and a spinner,
    other submits are disabled, and the sheet closes only after the save and reload succeed.
  - `setPrefs()` applies locale, theme and avatar instantly, then saves them in the background.
- Sheets (`src/ui/ui.tsx`):
  - `ui.open` replaces the current sheet; `ui.push` stacks one on top, keeping the sheet below mounted with its state.
  - Each open sheet owns a history entry, so Android back closes it. Tabs other than Today sit one entry above Today.
  - Sheets close by dragging the handle only, never the body.
- Dropdowns are always `src/ui/Select.tsx`, never a native `<select>`. It takes an optional last "+ New …" row.
- Themes are `[data-skin]` token blocks (midnight, light, milky). `index.html` applies the saved theme before first paint.
- Money rules (`src/domain/money.ts`, `recurring.ts`; keep the unit tests in step):
  - **Transfers** (`kind = 'transfer'`) move `amount` from `source_id` to `to_source_id`; `fee` comes out of the
    source on top. Only the fee counts as spending (`spendingView`).
  - **`money_flows()` in SQL and `flowsOf()` in TS** must produce the same flows.
  - **Expenses paid from a source** have `method_id` null and `source_id` set.
  - **Shared credit limits:** a card can share one other card's limit (`limit_shared_with`), one level only.
    `creditOutstanding` counts only charges dated up to today.
  - **Repeating entries:** a template is an entry with `repeat` set; copies have `repeat_of`. Only the template's
    creator posts copies, for the whole month when it starts (`monthEnd`).
  - **Editing a schedule** goes through `scheduleChange`: it never edits records dated today or earlier, replaces
    later copies, and splits the schedule into a new template. "Edit this entry" on a running template splits too.
  - **Coming up** looks 45 days ahead (`UPCOMING_DAYS`); `accountForecast` sums it per source.
- Privacy: other members never see your personal methods or sources, only "<name>'s personal funds".
  Members may update only a space's `name` and `tone` (column grant).

## Working with the user

- They use the app on an Android phone (Firefox and the installed PWA) and read replies there: keep replies short.
- Screens are checked at phone size with Playwright using Chromium at `/opt/pw-browsers/chromium`.
  A build without `VITE_SUPABASE_*` runs in demo mode, which needs no account.
- To see loading states, serve `npx vite` and use Playwright's `page.route` to rewrite `/src/data/store.tsx`,
  adding a delay inside `track`. Never add test hooks to the app.
- Known, left as is: Firefox shows a black screen when leaving an installed web app (a Firefox bug).
- Backlog: Android app (issue #12); a space owner cannot leave yet (only delete).
  Before the first prod release: turn off Confirm email and set the Site URL in both projects, and turn on
  leaked password protection in dev.
