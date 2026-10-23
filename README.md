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

## Connect a real backend (Supabase, free tier is enough)

1. Create a project at supabase.com.
2. Open **SQL Editor**, paste `supabase/migrations/20261023000000_money.sql` and run it
   (or `supabase link` + `supabase db push` with the Supabase CLI).
3. **Authentication → Email templates → Magic Link:** include the code, for example
   `Your Lifey code: {{ .Token }}`. The app signs in with a 6-digit code instead of a link, because on
   iPhone a link opens in Safari rather than in the installed app.
4. Copy **Project URL** and the **anon / publishable key** into `.env.local`:

   ```sh
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```

The anon key is safe in the browser: every table has row-level security, and the privacy rules
are enforced by the database (see the comments at the top of the migration).

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.

1. **Settings → Pages → Source:** GitHub Actions.
2. **Settings → Secrets and variables → Actions → Variables:** add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`. Without them the site is the demo build.
3. In Supabase, **Authentication → URL configuration:** set the Site URL to the Pages address.

Any static host (Netlify, Vercel, Cloudflare Pages) works the same way: build command
`npm run build`, output `dist`.

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
