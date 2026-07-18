#!/usr/bin/env node

/**
 * revoke-invite.mjs — Revoke one or more invite codes.
 *
 * Usage:
 *   node scripts/revoke-invite.mjs <code1> [code2 ...]     # Revoke specific codes
 *   node scripts/revoke-invite.mjs --all                    # Revoke ALL unused codes
 *   node scripts/revoke-invite.mjs --household <id>         # Revoke all codes for a household
 *
 * Runs: supabase db query --linked
 * Requires: supabase CLI linked to the project.
 */

import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ---- helpers ----

function query(sql) {
  const tmpFile = join(tmpdir(), `lifey-sql-${Date.now()}.sql`);
  try {
    writeFileSync(tmpFile, sql, "utf-8");
    const out = execSync(`supabase db query --linked --output-format json --file "${tmpFile}"`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
    return out ? JSON.parse(out) : [];
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

function listCodes() {
  return query(`
    SELECT ic.code, ic.expires_at, ic.used_at, h.name as household_name
    FROM public.invite_codes ic
    LEFT JOIN public.households h ON h.id = ic.household_id
    WHERE ic.used_at IS NULL AND ic.expires_at > now()
    ORDER BY ic.created_at DESC
    LIMIT 50;
  `);
}

// ---- main ----

const args = process.argv.slice(2);

if (args.length === 0) {
  // No args — show active codes
  console.error(">> Active (unused, not expired) invite codes:\n");
  const codes = listCodes();
  if (codes.length === 0) {
    console.error("   (none)");
  } else {
    for (const c of codes) {
      console.error(`   ${c.code}  —  household: ${c.household_name || c.household_id || '?'}  —  expires: ${c.expires_at}`);
    }
  }
  console.error("");
  console.error("Usage: node scripts/revoke-invite.mjs <code1> [code2 ...]");
  console.error("       node scripts/revoke-invite.mjs --all");
  console.error("       node scripts/revoke-invite.mjs --household <id>");
  process.exit(0);
}

const isAll = args.includes("--all");
const householdIdx = args.indexOf("--household");

let whereClause;
let label;

if (isAll) {
  whereClause = "used_at IS NULL AND expires_at > now()";
  label = "ALL unused codes";
} else if (householdIdx !== -1) {
  const hhId = args[householdIdx + 1];
  whereClause = `household_id = '${hhId}' AND used_at IS NULL`;
  label = `all codes for household ${hhId}`;
} else {
  // Specific codes
  const codeList = args.filter((a) => !a.startsWith("--"));
  if (codeList.length === 0) {
    console.error("!! No codes specified.");
    process.exit(1);
  }
  whereClause = `code IN (${codeList.map((c) => `'${c}'`).join(", ")})`;
  label = codeList.join(", ");
}

console.error(`>> Revoking ${label}...`);

const result = query(`
  UPDATE public.invite_codes
  SET expires_at = now()
  WHERE ${whereClause}
  RETURNING code, expires_at;
`);

if (result.length === 0) {
  console.error("!!  No codes were updated. They may already be used or expired.");
  process.exit(1);
}

console.error("");
console.error(`>> Revoked ${result.length} code(s):\n`);
for (const row of result) {
  console.error(`   ${row.code}  -  now expires: ${row.expires_at}`);
}
console.error("");
