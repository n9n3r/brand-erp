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

# --- Claim port 5432 -------------------------------------------------------
# `apt install postgresql` auto-creates a Debian-managed cluster ("main")
# that authenticates with a PASSWORD. If it (or anything else) is running on
# 5432, our password-less dev cluster can't bind and Prisma throws P1000
# ("Authentication failed"). Stop it before starting ours.
if command -v pg_lsclusters >/dev/null 2>&1; then
  pg_lsclusters --no-header 2>/dev/null | while read -r ver name port status owner; do
    if [ "$status" = "online" ]; then
      echo "▸ Stopping system cluster $ver/$name on port $port…"
      pg_ctlcluster --force "$ver" "$name" stop >/dev/null 2>&1 || true
    fi
  done
fi
if (echo > /dev/tcp/127.0.0.1/5432) >/dev/null 2>&1; then
  PID=$(ss -lptn "sport = :5432" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1 || true)
  if [ -n "$PID" ] && ! grep -q "pgdata" "/proc/$PID/cmdline" 2>/dev/null; then
    echo "▸ Killing non-MyBrand process $PID on port 5432…"
    kill "$PID" 2>/dev/null || true; sleep 1
  fi
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
DATABASE_URL="postgresql://postgres@127.0.0.1:5432/brandos?schema=public&connection_limit=10&pool_timeout=30&connect_timeout=10"
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
  echo "✗ PostgreSQL did not come up on 5432 — check /tmp/pg.log"
  echo "  (If you see P1000 'Authentication failed', another password-protected"
  echo "   Postgres owns port 5432. Stop it, or point DATABASE_URL at it with"
  echo "   valid credentials.)"
  exit 1; }
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
