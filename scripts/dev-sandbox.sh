#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# scripts/dev-sandbox.sh — one-command resume for the sandbox environment.
#
# The sandbox preview pauses servers between sessions and snapshots drop
# node_modules/ and Postgres's empty runtime directories. This script puts
# everything back: deps -> pgdata repair -> database -> build -> app.
#
# Usage:  bash scripts/dev-sandbox.sh
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

PG_BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)
if [ -z "$PG_BIN" ]; then
  echo "▸ Installing PostgreSQL…"
  sudo apt-get update -qq >/dev/null && sudo apt-get install -y -qq postgresql >/dev/null
  PG_BIN=$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)
fi

if [ ! -d node_modules ]; then
  echo "▸ Restoring dependencies…"
  npm install --no-audit --no-fund
fi

if [ -d pgdata ]; then
  echo "▸ Repairing pgdata (permissions + empty runtime dirs)…"
  chmod 700 pgdata
  for d in pg_notify pg_serial pg_snapshots pg_stat pg_stat_tmp pg_tblspc \
           pg_twophase pg_replslot pg_commit_ts pg_dynshmem \
           pg_logical/snapshots pg_logical/mappings pg_wal/archive_status pg_wal/summaries; do
    mkdir -p "pgdata/$d"; chmod 700 "pgdata/$d"
  done
else
  echo "▸ No pgdata found — initialising a fresh cluster + schema + seed…"
  "$PG_BIN/initdb" -D pgdata -A trust -U postgres --encoding=UTF8
  : > .env <<'ENVEOF'
DATABASE_URL="postgresql://postgres@127.0.0.1:5432/brandos?schema=public"
JWT_SECRET="local-dev-secret-8f4c2a91b7e34d05a1c9f6b2e8d74301c5a90f83b6d24e17"
APP_URL="http://localhost:3000"
SEED_SUPER_ADMIN_PASSWORD="Admin123!"
ENVEOF
fi

echo "▸ Starting PostgreSQL…"
pg_ctl -D "$PWD/pgdata" -l /tmp/pg.log status >/dev/null 2>&1 || \
  (pg_ctl -D "$PWD/pgdata" -l /tmp/pg.log -o "-p 5432 -k /tmp" start >/dev/null 2>&1 || \
   ("$PG_BIN/pg_ctl" -D "$PWD/pgdata" -l /tmp/pg.log -o "-p 5432 -k /tmp" start))
sleep 1
"$PG_BIN/psql" -h 127.0.0.1 -U postgres -tc "SELECT 1" >/dev/null 2>&1 || {
  echo "✗ PostgreSQL did not come up — check /tmp/pg.log"; exit 1; }
"$PG_BIN/psql" -h 127.0.0.1 -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='brandos'" | grep -q 1 || \
  "$PG_BIN/psql" -h 127.0.0.1 -U postgres -c "CREATE DATABASE brandos" >/dev/null

if ! DATABASE_URL="postgresql://postgres@127.0.0.1:5432/brandos?schema=public" \
  node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().\$connect().then(()=>{console.log();process.exit(0)}).catch(()=>process.exit(1))"; then
  echo "▸ Pushing schema…"; npm run db:push >/dev/null
  echo "▸ Seeding…"; npm run db:seed >/dev/null
else
  # schema exists; seed only if there are no users
  COUNT=$(DATABASE_URL="postgresql://postgres@127.0.0.1:5432/brandos?schema=public" \
    node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().user.count().then(c=>{console.log(c);process.exit(0)})")
  if [ "$COUNT" = "0" ]; then echo "▸ Seeding…"; npm run db:seed >/dev/null; fi
fi

echo "▸ Building…"
npm run build >/dev/null

echo "▸ Starting app on :3000 (logs: /tmp/brandos.log)…"
nohup npm start > /tmp/brandos.log 2>&1 &
sleep 3
curl -s -o /dev/null -w "App status: HTTP %{http_code}\n" http://localhost:3000/ || \
  { echo "✗ App failed to start — check /tmp/brandos.log"; exit 1; }

echo ""
echo "✓ MyBrand is running:"
echo "    demo    → demo@erpdemo.app  / Demo123!"
echo "    admin   → admin@erpdemo.app / Admin123!"
