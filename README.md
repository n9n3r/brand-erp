# MyBrand — ERP for Small Brands

A multi-brand ERP for small businesses: **sales tracking, inventory with manual
categories, customer directory, invoicing, reports, and a super-admin console**
that monitors every brand's logins and usage.

Built as a **single Next.js 14 app** (frontend + API) with **PostgreSQL +
Prisma**, deployable free on **Vercel + Neon**.

## Brand assets

| File | Purpose |
|---|---|
| `src/app/icon.svg` | Favicon / app icon (served automatically at `/icon.svg`) |
| `src/components/logo.tsx` | `LogoMark` (icon) and `Logo` (icon + wordmark) React components used across the app |
| `public/logo.svg` | Downloadable horizontal logo lockup for marketing use |

---

## Features

| Area | What it does |
|---|---|
| **Landing page** | Marketing page with Login / Sign-up entry points |
| **Auth** | Email+password sign-up (creates a brand workspace), login, logout, bcrypt hashing, JWT sessions in httpOnly cookies |
| **Password reset** | Email protocol: single-use SHA-256-hashed tokens, 1-hour expiry, previous tokens invalidated. Sends over any SMTP provider (Nodemailer); without SMTP configured, links are logged to the server console (and returned in the API response in dev) |
| **Inventory** | Products (SKU, cost/price, stock, reorder alerts), categories **created manually by the brand**, soft archive via active flag |
| **Customers** | Directory with contact info, order count, lifetime spend |
| **Sales & invoices** | POS-style screen; transactional stock check + decrement; auto-numbered invoices (`INV-2026-00001`); paid / partial / unpaid statuses; record part-payments later; printable invoice page |
| **Reports** | Date-range revenue, orders, average order, outstanding balance, daily revenue chart, top products, payment-status breakdown, CSV export |
| **Super admin** | Overview dashboard (brands, users, logins/day chart, platform revenue, top brands, live activity feed), create/edit/deactivate any brand (deactivation locks its users), create users for any brand (staff/admin/super-admin), reset user passwords, full activity log with filters |
| **Usage monitoring** | Every login and business action is written to `UsageLog`; users carry `lastLoginAt` + `loginCount` |

## Tech stack

- **Next.js 14** (App Router, TypeScript, server components) — frontend + REST API in one deployable
- **PostgreSQL** (Neon on the free tier) + **Prisma ORM**
- **Auth**: bcryptjs + jose (JWT in httpOnly cookie), edge middleware route guards
- **Tailwind CSS**, lucide-react icons, Recharts charts
- **Zod** request validation on every API route

## Quick start (local)

```bash
npm install                # also runs `prisma generate`
cp .env.example .env       # fill in DATABASE_URL + JWT_SECRET (npm run gen:secret)
npm run db:push            # create the schema
npm run db:seed            # demo brand + test accounts (optional)
npm run dev                # http://localhost:3000
```

### Getting "P1000: Authentication failed" from Prisma?

Your local Postgres doesn't accept the credentials in `DATABASE_URL` (fresh
installs give `postgres` no known password). Set one and create the database:

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres createdb brandos
```

…then retry `npm run db:push` with
`DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/brandos"`.
On Windows, run the same commands from an admin psql shell without `sudo -u postgres`.

### Getting "Timed out fetching a new connection from the connection pool"?

The app couldn't get a database connection in time. Usual causes & fixes:

1. **Postgres isn't actually reachable** — check it's running and test with
   `psql -h 127.0.0.1 -U postgres -d brandos -c "SELECT 1"`.
2. **`localhost` resolving to IPv6 (`::1`)** where Postgres isn't listening —
   use `127.0.0.1` in `DATABASE_URL` (the default in `.env.example`).
3. **Slow/briefly-paused database** — the default URL in `.env.example`
   already includes `connection_limit=10&pool_timeout=30&connect_timeout=10`
   to ride out short stalls.

> **Sandbox preview resuming?** If you're returning to this workspace after the
> preview servers paused, run `bash scripts/dev-sandbox.sh` — it restores
> dependencies, repairs/restarts the local Postgres, rebuilds, and relaunches
> the app in one command (including reclaiming port 5432 from any
> password-protected system cluster that apt may have auto-created).

### Seeded test accounts

| Role | Email | Password |
|---|---|---|
| Super admin | `admin@erpdemo.app` | `Admin123!` |
| Brand admin (Amaka Skincare) | `demo@erpdemo.app` | `Demo123!` |
| Brand staff | `staff@erpdemo.app` | `Demo123!` |

> Change `SEED_SUPER_ADMIN_PASSWORD` before seeding in any shared environment.

## Deploy free on Vercel + Neon

1. **Database — Neon** (free tier): create a project at [neon.tech](https://neon.tech),
   copy the **pooled** connection string (`...-pooler...neon.tech/neondb?sslmode=require`).
2. **Push the schema** from your machine:
   ```bash
   DATABASE_URL="<neon-pooled-url>" npm run db:push
   DATABASE_URL="<neon-pooled-url>" npm run db:seed   # optional demo data
   ```
3. **App — Vercel**: push this repo to GitHub → *New Project* → import. Add
   environment variables:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled connection string |
   | `JWT_SECRET` | long random string (`npm run gen:secret`) |
   | `APP_URL` | `https://your-app.vercel.app` |
   | `SMTP_HOST` (+ `SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASS`) | optional — enables real reset/verification emails via any SMTP provider |
   | `MAIL_FROM` | optional — e.g. `MyBrand <noreply@yourdomain>` |
4. Deploy. The default build command (`npm run build`) already runs
   `prisma generate`. Node 20 is used automatically.
5. Seed the super admin against production (if you skipped step 2):
   ```bash
   DATABASE_URL="<neon-pooled-url>" npm run db:seed
   ```

**Cost today: $0.** Vercel Hobby + Neon Free comfortably serve 10–100 users
(see `ARCHITECTURE.md` for the scale-up path).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | develop / build / run production |
| `npm run db:push` | sync Prisma schema to the database |
| `npm run db:seed` | load super admin + demo brand |
| `npm run db:studio` | browse data in Prisma Studio |
| `npm run gen:secret` | generate a JWT secret |

## Project structure

```
prisma/schema.prisma        # data model (Brand, User, Product, Sale, UsageLog…)
prisma/seed.ts              # demo data
src/middleware.ts           # edge auth guard + role routing
src/lib/                    # auth, jwt, validation, api helpers, services/reports
src/app/page.tsx            # landing page
src/app/(auth)/…            # login, signup, forgot/reset password
src/app/(dashboard)/…       # brand workspace: dashboard, inventory, customers,
                            # sales/new, invoices, reports, settings
src/app/(admin)/admin/…     # super admin console: overview, brands, users, logs
src/app/api/…               # REST API (auth, CRUD, sales, admin)
```

## Security notes

- Passwords: bcrypt (10 rounds); sessions: signed HS256 JWTs, httpOnly + SameSite=Lax cookies, 7-day expiry
- **Password policy**: 10–72 characters, at least one letter and one number, common-password blocklist, and (at signup) may not contain your email or name — enforced server-side by Zod and shown live in the signup UI
- **Session invalidation**: every user carries a `tokenVersion`; password resets (self-service or admin-set) bump it, instantly killing all of that user's existing sessions server-side
- **Email verification**: signup sends a single-use, SHA-256-hashed, 24-hour token; unverified users see a persistent banner with a resend action; super admins see an "unverified email" badge
- Every API route validates input with Zod and re-checks the user/brand is active + session version in the database (deactivated accounts and stale sessions lose access immediately)
- All brand-scoped queries filter by `brandId` — one brand can never read another's data (verified by test)
- Reset tokens: 32 random bytes, stored only as SHA-256 hashes, single-use, 1-hour expiry
- Guards: cannot deactivate/demote yourself; cannot remove the last super admin; deactivating a brand locks its users out
- **Before real production use**: add rate limiting (e.g. Upstash) on `/api/auth/*`, and set `APP_URL`/`SMTP_HOST` (+ SMTP credentials) so emails actually send
