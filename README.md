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
| **Password reset** | Email protocol: single-use SHA-256-hashed tokens, 1-hour expiry, previous tokens invalidated. Works with Resend; without an email provider, links are logged to the server console (and returned in the API response in dev) |
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

> **Sandbox preview resuming?** If you're returning to this workspace after the
> preview servers paused, run `bash scripts/dev-sandbox.sh` — it restores
> dependencies, repairs/restarts the local Postgres, rebuilds, and relaunches
> the app in one command.

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
   | `RESEND_API_KEY` | optional — enables real reset emails |
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
- Every API route validates input with Zod and re-checks the user/brand is active in the database (deactivated accounts lose access immediately)
- All brand-scoped queries filter by `brandId` — one brand can never read another's data (verified by test)
- Reset tokens: 32 random bytes, stored only as SHA-256 hashes, single-use, 1-hour expiry
- Guards: cannot deactivate/demote yourself; cannot remove the last super admin; deactivating a brand locks its users out
- **Before real production use**: add rate limiting (e.g. Upstash) on `/api/auth/*`, and set `APP_URL`/`RESEND_API_KEY` so reset emails actually send
