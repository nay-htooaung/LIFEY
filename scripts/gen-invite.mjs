#!/usr/bin/env node

/**
 * gen-invite.mjs — Generate invite codes for a LIFEY household.
 *
 * Usage:
 *   node scripts/gen-invite.mjs                     # First household, 1 code, 7-day expiry
 *   node scripts/gen-invite.mjs --count 5           # Generate 5 codes
 *   node scripts/gen-invite.mjs --days 30           # 30-day expiry
 *   node scripts/gen-invite.mjs --household <id>    # Specific household
 *
 * Runs: supabase db query --linked
 * Requires: supabase CLI linked to the project (supabase link already done)
 */

import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ---- helpers ----

function randomCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

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

// ---- main ----

const args = process.argv.slice(2);
const countIdx = args.indexOf("--count");
const daysIdx = args.indexOf("--days");
const householdIdx = args.indexOf("--household");

const count = countIdx !== -1 ? parseInt(args[countIdx + 1], 10) || 1 : 1;
const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1], 10) || 7 : 7;
const specificHousehold = householdIdx !== -1 ? args[householdIdx + 1] : null;

// 1. Find a household
console.error(">> Fetching households...");
const households = query("SELECT id, name FROM public.households ORDER BY created_at ASC LIMIT 20;");

if (households.length === 0) {
  console.error("");
  console.error("!! No households found in the database.");
  console.error("");
  console.error("   To create test data:");
  console.error("     1. Go to Supabase Dashboard -> Authentication -> Users -> Add User");
  console.error("     2. Create a test user with email + password");
  console.error("     3. The on_auth_user_created trigger will create a profile");
  console.error("     4. Run this script again");
  console.error("");
  process.exit(1);
}

let targetHousehold;
if (specificHousehold) {
  targetHousehold = households.find(
    (h) => h.id === specificHousehold || h.name === specificHousehold
  );
  if (!targetHousehold) {
    console.error("!! Household not found. Available:");
    for (const h of households) console.error(`   ${h.id}  -  ${h.name}`);
    process.exit(1);
  }
} else {
  targetHousehold = households[0];
}
console.error(`   -> ${targetHousehold.name} (${targetHousehold.id})`);

// 2. Find a profile to be the creator
console.error(">> Finding profile...");
const profiles = query("SELECT id, display_name FROM public.profiles ORDER BY created_at ASC LIMIT 1;");

if (profiles.length === 0) {
  console.error(">> No profiles found. At least one user must sign up first.");
  process.exit(1);
}
const profile = profiles[0];
console.error(`   -> ${profile.display_name} (${profile.id})`);

// 3. Generate random codes
const codes = [];
for (let i = 0; i < count; i++) codes.push(randomCode(8));

const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

console.error(`\n>> Generating ${count} invite code(s)...`);
console.error(`   Household: ${targetHousehold.name}`);
console.error(`   Created by: ${profile.display_name}`);
console.error(`   Expires:    ${expiresAt}\n`);

// 4. Insert codes and get back results
const values = codes.map((c) =>
  `('${targetHousehold.id}', '${c}', '${profile.id}', '${expiresAt}')`
).join(",\n      ");

const insertResult = query(`
  INSERT INTO public.invite_codes (household_id, code, created_by, expires_at)
  VALUES ${values}
  ON CONFLICT (code) DO NOTHING
  RETURNING code, expires_at;
`);

// 5. Print results
if (insertResult.length === 0) {
  console.error("!! No codes were inserted (all may already exist as conflicts).");
  process.exit(1);
}

console.error(">> Generated invite codes:\n");
for (const row of insertResult) {
  const inviteUrl = `https://lifey-172.pages.dev?code=${row.code}`;
  // Print to stdout (so it can be piped/captured)
  console.log(`${row.code}`);
  console.error(`   ${row.code}  ->  ${inviteUrl}`);
  console.error(`              Expires: ${row.expires_at}`);
  console.error("");
}
