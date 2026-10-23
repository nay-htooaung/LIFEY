#!/usr/bin/env bash
# Runs the migrations and privacy tests against a throwaway local Postgres (16+).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
bin="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
tmp="$(mktemp -d)"
chmod 777 "$tmp"
as_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
cleanup() { as_pg "$bin/pg_ctl" -D "$tmp/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$tmp"; }
trap cleanup EXIT
as_pg "$bin/initdb" -D "$tmp/data" -U postgres --auth=trust >/dev/null
as_pg "$bin/pg_ctl" -D "$tmp/data" -o "-k $tmp -p 54329 -c listen_addresses=''" -w start >/dev/null
psql=(psql -h "$tmp" -p 54329 -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${psql[@]}" -f "$here/auth_stub.sql"
for f in "$here"/../migrations/*.sql; do "${psql[@]}" -f "$f"; done
"${psql[@]}" -o /dev/null -f "$here/privacy_test.sql"
