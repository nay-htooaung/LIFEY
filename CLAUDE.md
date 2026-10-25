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
  Check migrations and deploys through the CI log instead. Never apply migrations with the Supabase MCP
  `apply_migration` tool (it hangs on SQL containing DELETE and skips the repo's history); CI applies them.
- When removing a feature, remove the code, i18n keys and CSS it leaves unused, in the same commit.
- Do not touch prod (`lifey-prod`) and do not open or merge a PR to `main` unless the user asks.
  The user releases to prod themselves at v1.0.0.

## Workflow for every request

The user asks for a change; carry it through to a review, and deploy only when they say so:

1. `git fetch` and start from the latest `develop` on the session's branch (a `ccr-*` branch, or a work branch
   cut from `develop`; merge `develop` in first). Read the code you change.
2. Make the change. Database changes get a new migration and new checks in `supabase/tests/privacy_test.sql`;
   money logic gets unit tests in `src/domain/money.test.ts`.
3. Test it the way the user will use it: build, serve, and drive the screens in Playwright at phone size
   (390×844). Look at the screenshots, fix what looks wrong, and test the edge cases (errors, empty states,
   long text, both languages).
4. Run `npm run typecheck && npm test && npm run build && npm run test:db`; all four must pass.
5. Commit with a message that says what changed for the user and why, and push the work branch (not `develop`;
   other branches only run the checks, no deploy).
6. Send the user screenshots of the changed screens (before/after where it helps, Japanese first) and reply
   briefly: what changed, how it was tested, anything left or worth deciding.
7. Deploy only when the user asks: merge the work branch into `develop`, `git push origin develop`, and wait for
   the Deploy run. If it fails, read the job log, fix and push again. For migrations, confirm in the log that
   "Apply database migrations" applied them.

Ask before anything risky (prod, `main`, deleting data, changing what others in a space can see).

## Environments and deploy

| | dev | prod |
| --- | --- | --- |
| Branch | `develop` | `main` |
| Supabase | `lifey-dev` `uezezkydnlbksrqvaipr` | `lifey-prod` `klxhdsravxkprqxdgebv` |
| Site | https://lifey-dev.naytech001.workers.dev | Worker `lifey` (not deployed yet) |

- The Worker (`worker/index.ts`) serves the static build, `/api/chat` (the assistant's model proxy) and `/api/models`.
  Two providers; model ids carry theirs (`go:kimi-k3`, `gemini:gemini-3.6-flash`):
  - **OpenCode Go** (the user's subscription, secret `OPENCODE_API_KEY`): its live model list, keeping the
    chat/completions models (models.dev catalogue; Claude, GPT and Grok use other formats). Requests need an
    `x-opencode-session` id per conversation (the app sends one). Its stream is already in the app's format.
  - **Gemini** free tier (secret `GEMINI_API_KEY` from an AI Studio project without billing): only `GEMINI_MODELS`
    (3.6 Flash; newer ones were overloaded), through the native streaming API. `worker/gemini.ts` translates to and
    from the app's OpenAI chat format; Gemini 3 needs each tool call's thought signature (`extra_content`) back, and a
    call another model made gets the documented stand-in signature.
  `AI_PREFERRED` orders the recommendation: DeepSeek V4.1 Flash (fast, reads photos, reliable tool calls; Kimi K3
  sent cut-short calls in 3 of 10 tries). The reply streams at once with a keep-alive every 5 s (phones drop silent
  connections). A model that is busy (429/503), refused (404, then hidden for an hour) or silent for 20 s hands over to
  the next, up to three. Secrets must be type Secret (a Text variable is wiped by the next deploy). OpenCode's free
  Zen models refuse requests from outside OpenCode. This sandbox reaches neither provider; test on dev with the
  account `smoke.assistant@example.com` (password in the environment variable `LIFEY_SMOKE_PASSWORD`) and `wrangler tail lifey-dev`
  (pipe `tail -f /dev/null` into it so it stays open).
- `.github/workflows/deploy.yml` runs on pushes to `develop` and `main`: checks, then `node scripts/migrate.mjs <ref>` applies pending migrations
  through the Supabase Management API (only `SUPABASE_ACCESS_TOKEN` is needed; GitHub runners cannot reach the
  IPv6-only database), then builds and deploys to Cloudflare. Refs, URLs and publishable keys are public and live in the workflow.
- Prod has only migrations `20261023000000` and `20261023010000`; the rest arrive with the first merge to `main`.
- `main` still holds the old app (July, `frontend/`+`backend/`, Tailwind), as do the `story/*` branches.
  The user replaces it with `develop` at the v1.0.0 release (pushing `main` deploys prod). Other branches run
  `check.yml` only (the four checks, no deploy). `rebuild/money-mvp` is the retired name of `develop`.
- Sign-up is invitation only: `select public.create_signup_invite('note', days);` in the SQL editor (README).
- Latest migration: `20261025010000_profile_photo.sql`.
- Version: `package.json` (0.x.x until the v1.0.0 release), shown with the commit in the menu (lifey 家計 ⌄). Bump it with each
  deploy to dev: minor for new features, patch for fixes.
- Pushing `develop` deploys dev (only on the user's go-ahead); to deploy dev by hand (the session has `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`):
  build with dev's `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (in deploy.yml), then `npx wrangler deploy --env dev`.
- The app looks for a new version every 30 minutes and when it comes back to the screen (`src/ui/update.ts`), shows 更新しています… and reloads, waiting while a sheet is open.
- Dev has throwaway test accounts (`smoke.*@example.com`); leave them.
- Parallel sessions may work on their own branches (`ccr-*`) cut from `develop`. Before adding a
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
- お財布: tapping a source or a payment method opens `AccountDetail`: its balance (or what is owed), then month by
  month what went through it (`accountLines`: entries, card statements on their payment day, and one line for
  members' entries I cannot see), this month split into 予定 and 記録済み; older months load on scroll. Edit is the
  ✎ button at the top. Categories on 計画 open `CategoryDetail` the same way.
- Dropdowns are always `src/ui/Select.tsx`, never a native `<select>`. It takes an optional last "+ New …" row.
  Text fields that offer earlier values use `src/ui/Suggest.tsx` (entry name and tags); months are picked with `src/ui/MonthWheel.tsx`.
- Themes are `[data-skin]` token blocks (midnight, light, milky). `index.html` applies the saved theme before first paint.
- Money rules (`src/domain/money.ts`, `recurring.ts`; keep the unit tests in step):
  - **Transfers** (`kind = 'transfer'`) move `amount` from `source_id` to `to_source_id`; `fee` comes out of the
    source on top. Only the fee counts as spending (`spendingView`). A transfer may instead leave a credit card
    (`method_id`, `source_id` null) into an e-money source: amount + fee is a charge on the card.
  - **`money_flows()` in SQL and `flowsOf()` in TS** must produce the same flows.
  - **Expenses paid from a source** have `method_id` null and `source_id` set.
  - **Sources** are cash, bank or e-money (`emoney`, charged by transfers and paid from directly; there is no
    e-money payment method, PayPay あと払い etc. are set up as cards). Every personal
    space has one `fixed` cash source from sign-up: only its balance can change (a DB trigger guards it).
    Income defaults to it.
  - **Shared credit limits:** a card can share one other card's limit (`limit_shared_with`), one level only.
    `creditOutstanding` counts only charges dated up to today.
  - **Repeating entries:** a template is an entry with `repeat` set; copies have `repeat_of`. Only the template's
    creator posts copies, for the whole month when it starts (`monthEnd`).
  - **Editing a schedule** goes through `scheduleChange`: it never edits records dated today or earlier, replaces
    later copies, and splits the schedule into a new template. "Edit this entry" on a running template splits too.
  - **今月 tab** (the first tab; its code is still `Today`): everything I logged this month up to today across every
    space (支出 / 収入 / 差額), then my spending per space (they add up to the total), then 今後の予定 for the space.
  - **月末に残るお金** (`monthEndPlan`, top of 計画; only the title and the amount, no explanation or breakdown): cash in the space's sources at the end
    of the month if every budget is used up: sources now, plus income still to come, less card statements paid later
    this month, less what the budgets still allow (assumed paid this month) and scheduled bills that leave the
    sources this month, other such payments and moves to other spaces, and 貯金 (pot totals plus this month's still
    due). Card charges billed next month are not counted.
  - **貯金 pots** (`pots`, `pot_moves`) belong to a space like categories: money set aside on paper, not an account.
    Moves are logged by hand (+ button, 貯金 tab; positive saves, negative takes out); totals are summed, never
    stored. Each pot's monthly amount (or more, if more went in this month) comes off what is left to spend
    (`setAside`). お財布 splits 純資産 into うち貯金 and 自由に使えるお金. Pots are archived, never deleted.
  - **Coming up** on Today lists what is still due this month (`upcomingThisMonth`); the assistant looks 45 days
    ahead (`UPCOMING_DAYS`). The balance card under it projects each account to the end
    of this month (`projection` until `monthEnd`): every repeating occurrence still to come, and the card payments they lead to.
- Assistant (`src/assistant/`): the model runs behind `/api/chat`, which checks the Supabase token (`ai_use()`, which
  also counts requests per person per day, with no limit) before each call. Its tools (`tools.ts`) run in the app
  (`run.ts`, `setup.ts`) on the signed-in person's data, so it sees only what they see. It can propose anything the
  person can do (entries, schedules, categories and budgets, sources, payment methods, spaces, profile) but never
  saves: every `propose_*` tool adds a change to a tray the person reviews (entry before/after from
  `domain/changes.ts`) and applies with a long press, setup first; a proposal can use what an earlier one creates by
  its `new:…` id. Undo reverses what the app can (not leaving a space, removing a member, a new invite code,
  deleting a category, a schedule change). The system prompt never changes; the app guide (`appGuide`, with the
  screens' real names, today, language and space) goes with the first message of a conversation only, and later
  moves (space, date, language) are told as `[app]` notes, so each conversation's requests share a cacheable start.
- Profile photos: `profiles.avatar` holds a character id or a small square JPEG data URL (`src/ui/photo.ts`, 192 px,
  under 100 KB; the DB allows images up to 120,000 characters). The assistant is told only "photo".
- Privacy: other members never see your personal methods or sources, only "<name>'s personal funds".
  A personal payment method can be lent to shared spaces (`method_shares`, set in its edit sheet): members may pay
  expenses there with it and learn only its name, kind and owner (`shared_methods()`, shown as "<name>'s <card>").
  Charges go on the owner's card (`money_flows()` shows them to the owner only), who pays the bill. Stopping a share
  sets `stopped_at`, so past entries keep the name and can still be edited.
  Members may update only a space's `name` and `tone` (column grant).

## Names and removed features

The user uses the app in Japanese. Agreed names (en / ja): Expense 支出, Income 収入, Transfer 振替 (fee 手数料),
This month 今月 (the first tab), History 履歴, Coming up 今後の予定, Space スペース, Duplicate 複製 (copy an entry to today),
Edit schedule 繰り返しを編集, Edit this entry この記録を編集.

Removed on purpose; do not bring back without asking:

- Today (now 今月): the streak card and no-spend days, Recent entries, 今月使えるお金 (the budget ring and daily
  ribbon, `safeToSpend`), a list of spaces to switch to, a "your total" row under the by-space card.
- History: search and filter chips (it is a month calendar now), the month's totals (moved to 今月), and the ‹ › month arrows
  (months change by swiping the calendar or with the year/month wheels). Tapping the selected day again logs on it.
- Sign-in: "Try with example data" (demo mode only runs when the build has no Supabase settings).
- "Bank transfer ·" in front of source names under Paid with (sources are listed by name).
- Native `<select>`, closing a sheet by dragging its body, and the words household / グループ in the UI.
- "+ New" under Save to (creating a space mid-entry would switch spaces).

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
