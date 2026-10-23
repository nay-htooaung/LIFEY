// Applies pending supabase/migrations/*.sql to a Supabase project through the Management API.
// Needs only SUPABASE_ACCESS_TOKEN: no database password, and HTTPS works where the database's
// IPv6-only direct address does not (GitHub runners). History is kept in
// supabase_migrations.schema_migrations, the same table the Supabase CLI uses.
//
//   SUPABASE_ACCESS_TOKEN=... node scripts/migrate.mjs <project-ref> [--dry-run]
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const [ref, flag] = process.argv.slice(2)
const token = process.env.SUPABASE_ACCESS_TOKEN
if (!ref || !token) {
  console.error('usage: SUPABASE_ACCESS_TOKEN=... node scripts/migrate.mjs <project-ref> [--dry-run]')
  process.exit(2)
}
const dryRun = flag === '--dry-run'
const dir = new URL('../supabase/migrations/', import.meta.url).pathname

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`${res.status}: ${body}`)
  return JSON.parse(body)
}
const quote = (s) => `'${s.replaceAll("'", "''")}'`

const files = readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort()
const rows = await query(`
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
  select version from supabase_migrations.schema_migrations;`)
const applied = new Set(rows.map((r) => r.version))

const known = new Set(files.map((f) => f.split('_')[0]))
const unknown = [...applied].filter((v) => !known.has(v))
if (unknown.length) {
  console.error(`${ref} has migrations this repo does not: ${unknown.join(', ')}. Stopping.`)
  process.exit(1)
}

const pending = files.filter((f) => !applied.has(f.split('_')[0]))
if (!pending.length) console.log(`${ref}: up to date (${files.length} migrations)`)
for (const f of pending) {
  const [version, ...rest] = f.replace(/\.sql$/, '').split('_')
  if (dryRun) {
    console.log(`${ref}: would apply ${f}`)
    continue
  }
  const sql = readFileSync(join(dir, f), 'utf8')
  // one transaction per file: the migration and its history row land together or not at all
  await query(`begin;
${sql}
;
insert into supabase_migrations.schema_migrations (version, name) values (${quote(version)}, ${quote(rest.join('_'))});
commit;`)
  console.log(`${ref}: applied ${f}`)
}
