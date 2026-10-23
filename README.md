# Lifey

One app for the people you live with. Everyone has a private space and can share any number of
households (a home, a share house, a trip). **Money** is the first module; recipes, fridge and
tasks will use the same spaces later.

It is an installable web app (PWA): one codebase for iPhone and Android, installed from the browser.

## What's in the MVP

- **Spaces:** Me (only you) plus households you create or join with an invite code.
- **Sources:** bank accounts, savings, cash. **Payment methods:** cash, debit, e-money, credit cards
  with a closing day (締め日) and payment day (支払日, following month).
- **Entries:** expense or income in whole yen, with custom category, note, tags, date and repeat
  (weekly, every 2 weeks, monthly, yearly). Repeating entries post themselves when due.
- **No splitting.** Each person logs exactly what they paid, from any method in a space they belong to.
  A household entry paid with your own card shows to members as "your personal funds"; the card,
  its balance and your personal totals stay private.
- **Today screen:** safe-to-spend for today, a daily spending ribbon for the month, a logging streak
  with no-spend days, upcoming bills and card payments, and per-member spending in households.
- **Plan:** budgets per category with a pace marker. **Wallet:** balances and card statements,
  all derived from entries.
- English and Japanese. Black ("Midnight") theme; colours are tokens in `src/styles/themes.css`,
  so another theme is one more token block.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
```

With no Supabase settings the app runs in **demo mode**: example data stored on this device only.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Unit tests for the money logic (statements, balances, recurring, budgets, streaks) |
| `npm run test:db` | Runs the migration on a throwaway local Postgres 16 and checks the privacy rules |

## Environments

| | dev | prod |
| --- | --- | --- |
| Git branch | `develop` | `main` |
| Cloudflare Worker | `lifey-dev` | `lifey` |
| Supabase project (free plan, Tokyo) | `lifey-dev` (`uezezkydnlbksrqvaipr`) | `lifey-prod` (`klxhdsravxkprqxdgebv`) |
| GitHub environment | `dev` | `production` |

`.github/workflows/deploy.yml` runs on pushes to `develop` and `main`: it runs the checks, applies database migrations, builds with that
environment's Supabase settings and deploys to Cloudflare (Workers static assets, see `wrangler.jsonc`).
Steps whose credentials are missing are skipped, so the workflow is safe to run before setup is done.
Other branches and pull requests run `.github/workflows/check.yml`: the same checks, no deploy.

### One-time setup

1. **Supabase:** create two free projects, `lifey-dev` and `lifey-prod`. In each, open **Authentication → Sign In / Providers → Email**
   and turn **Confirm email** off. The app signs in with email + password, so no emails are sent and
   no custom SMTP server is needed. (Password reset emails need your own SMTP server, e.g. Resend or Brevo.)
   Under **Authentication → URL configuration**, set the Site URL to that environment's Cloudflare URL.
2. **Cloudflare:** create an API token with the *Edit Cloudflare Workers* template and note your account ID.
3. **GitHub → Settings → Secrets and variables → Actions:**
   - Repository secrets: `CLOUDFLARE_API_TOKEN`, `SUPABASE_ACCESS_TOKEN` (supabase.com → Account → Access tokens).
   - Repository variable: `CLOUDFLARE_ACCOUNT_ID`.
   - Project refs, URLs and publishable keys are public and set in `deploy.yml`. Migrations are applied by
     `scripts/migrate.mjs` through the Supabase Management API, so no database password is needed.

The anon key is safe in the browser: every table has row-level security, and the privacy rules
are enforced by the database (see the comments at the top of the migration).

### Inviting people

Sign-up is invitation only. Each code lets one new account register and then it is spent; unused
codes expire (7 days by default). The database enforces this, so the app cannot skip it.
In the Supabase SQL editor of the right project:

```sql
select public.create_signup_invite('for Sam');      -- valid 7 days
select public.create_signup_invite('for Sam', 1);   -- valid 1 day
select * from public.signup_invites order by created_at desc;  -- who used what
```

Adding a user from the Supabase dashboard fails, because it cannot send a code. Invite people through the app.

### Local development against dev

Put the dev project's values in `.env.local`:

```sh
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

## Install on a phone

- **iPhone:** open the site in Safari → Share → **Add to Home Screen**.
- **Android:** open in Chrome → menu → **Install app**.

## Layout

```
src/domain/      money rules with no UI: dates, card statements, balances, recurring, streaks
src/data/        Repo interface, demo (localStorage) and Supabase implementations, React store
src/i18n/        en.ts / ja.ts (ja must have every key in en; the compiler checks it)
src/screens/     Today, Activity, Wallet, Plan, SignIn
src/sheets/      bottom sheets: log entry, entry detail, source, method, category, spaces, menu
src/styles/      themes.css (tokens) and app.css
supabase/        migration + privacy tests
```

## Known limits

- Changes need a connection in Supabase mode; the app shell itself works offline.
- Reminders before bills are planned (web push) but not built yet.
- Names you type (categories, sources) are not translated when you switch language.
