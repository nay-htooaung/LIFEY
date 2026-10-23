# Lifey: notes for coding agents

- Stack: React 19 + TypeScript + Vite + vite-plugin-pwa, Supabase (Postgres + RLS). No router, no CSS framework.
- Before committing, run `npm run typecheck && npm test && npm run build && npm run test:db`.
- Money is whole yen (integers). Dates are local `YYYY-MM-DD` strings (`src/domain/dates.ts`).
- Balances and card statements are always derived from entries/flows, never stored.
- Privacy lives in the database: change `supabase/migrations/*` and extend `supabase/tests/privacy_test.sql` together.
  Add a new migration file rather than editing one that has been applied.
- Every user-facing string goes through `t()`; add the key to both `src/i18n/en.ts` and `ja.ts`.
- Colours come from tokens in `src/styles/themes.css`; never hard-code a colour in a component.
- UI copy: plain, short, active voice.
