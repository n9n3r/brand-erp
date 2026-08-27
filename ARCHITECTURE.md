# MyBrand — Architecture

## 1. Goals & constraints

| Requirement | Decision it drives |
|---|---|
| Small brands track sales, inventory (manual categories), customers, invoices, reports | Standard modular ERP domain model |
| Landing page + login/sign-up + password reset | Public marketing shell + auth subsystem |
| Super admin oversees all brands, edits any brand, monitors logins & usage frequency | Multi-tenant platform with two planes: tenant (brand) + platform (admin) |
| 10–100 users to start, room to grow | Stateless serverless + managed Postgres; scale path in §8 |
| Free hosting for testing, upgrade later | Vercel Hobby + Neon Free today; same codebase scales up |

## 2. System overview

```
                          ┌─────────────────────────────────────────────┐
                          │                VERCEL (free)                │
   Browser ──────────────▶│  Next.js 14 (one deployment)                │
   (brand staff /         │  ┌───────────────┐   ┌────────────────────┐ │
    brand admin /         │  │ React UI      │   │ REST API routes    │ │
    super admin)          │  │ App Router    │──▶│ /api/* (Zod-val.)  │ │
                          │  │ RSC pages     │   │ + service layer    │ │
                          │  └───────────────┘   └─────────┬──────────┘ │
                          │  Edge middleware:               │            │
                          │  JWT verify, role routing       ▼            │
                          │  (login/admin/brand areas)   Prisma ORM     │
                          └─────────────────────────────┬───────────────┘
                                                        │ (pooled conn.)
                                                        ▼
                                              ┌──────────────────┐
                        Optional: SMTP ──────│  PostgreSQL       │
                        (Nodemailer)         │  (Neon free tier) │
                                              └──────────────────┘
```

**Why this shape**

- *One deployable* (frontend + API) → zero cross-service latency, one repo, one
  `git push` to ship. Ideal for a small team validating a product.
- *Stateless JWT sessions* → any serverless instance can authorize a request
  without a session store; revocation handled by DB re-validation on brand/user
  status (see §5).
- *Managed Postgres* → real relational integrity (transactions for sales,
  unique invoice numbers) that SQLite/Dynamo-style stores can't give cheaply.

## 3. Stack decisions

| Layer | Choice | Rationale / alternatives |
|---|---|---|
| Frontend + backend | Next.js 14 App Router, TypeScript, React Server Components | RSC keeps dashboards fast (data rendered server-side, minimal client JS); API routes colocated. Alternative: separate React SPA + Express — two deployments, more CORS/auth plumbing, no benefit at this scale |
| Styling | Tailwind CSS | Fast to keep consistent; zero runtime CSS |
| Database | PostgreSQL (Neon) | Serverless-friendly, generous free tier, real SQL aggregates for reports. Alternatives: Supabase (same engine, fine swap), PlanetScale (MySQL, no free tier now) |
| ORM | Prisma | Type-safe queries, migrations, `db push` for prototyping. Alternative: Drizzle (lighter, less tooling) |
| Auth | bcryptjs + jose JWT in httpOnly cookie | No external dependency (Auth0/Clerk cost money and add lock-in); edge-verifiable in middleware. Alternative: NextAuth — heavier, session storage choices complicate serverless |
| Email | Nodemailer over SMTP (optional) | Any provider (Gmail, Resend SMTP, Mailgun, SES, Mailpit); logs to console when `SMTP_HOST` is unset so testing stays free |
| Charts | Recharts | Declarative, SSR-friendly |
| Validation | Zod | One schema language for every endpoint body |

## 4. Data model

```
Brand 1─┬─* User            (role: SUPER_ADMIN | BRAND_ADMIN | BRAND_USER)
        ├─* Category ──* Product        (categories are brand-defined = "manual")
        ├─* Customer
        ├─* Sale ──* SaleItem           (SaleItem snapshots name+price,
        └─* UsageLog                       so invoice history survives
                                           product edits/deletes)
User ──* PasswordResetToken       (sha256(token), expiresAt, usedAt)
User ──* UsageLog                 (LOGIN, SALE_CREATED, …)
```

Key constraints & behaviours

- `@@unique([brandId, name])` on Category, `@@unique([brandId, sku])` on Product,
  `@@unique([brandId, invoiceNumber])` on Sale — per-brand uniqueness.
- Money as `Decimal(12/14, 2)` — never floats.
- Invoice numbers: atomic per-brand counter `Brand.invoiceSeq` incremented inside
  the sale transaction → `INV-2026-00001`.
- Deletes are history-preserving: deleting a product/customer nulls the link but
  SaleItem/Customer snapshots keep invoices intact; deleting a brand cascades
  everything under it.
- Multi-tenancy: shared schema + `brandId` scoping enforced in `requireApiBrandUser()`
  and every query (verified by cross-brand isolation test).

## 5. Auth & session flow

```
signup  ─▶ create Brand + BRAND_ADMIN (tx) ─▶ set JWT cookie ─▶ /dashboard
login   ─▶ bcrypt check ─▶ user & brand active? ─▶ set JWT cookie
          ─▶ update lastLoginAt/loginCount ─▶ UsageLog(LOGIN)
guard   ─▶ edge middleware verifies JWT on every /dashboard|/admin route:
          unauth → /login?next=…; super admin ↔ brand area separation
server  ─▶ RSC layouts + every API route re-validate against DB:
          user.isActive && brand.isActive (blocks deactivated accounts
          even with an unexpired JWT)
logout  ─▶ UsageLog(LOGOUT) ─▶ cookie cleared
```

**Password reset protocol**

```
forgot-password ─▶ (always 200, no account enumeration)
                  └─ if account: invalidate prior tokens, mint 32-byte token,
                     store sha256(token) w/ 1h expiry, email link /reset-password/<t>
reset-password  ─▶ lookup by sha256(token) ─▶ unused & unexpired?
                  ─▶ set new bcrypt hash, mark token used (single-use)
```

## 6. API surface

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/signup · login · logout · forgot-password · reset-password`, `GET /api/auth/me` |
| Catalogue | `GET/POST /api/products`, `PATCH/DELETE /api/products/[id]` — same for `/api/categories` |
| CRM | `GET/POST /api/customers`, `PATCH/DELETE /api/customers/[id]` |
| Sales | `GET/POST /api/sales` (POST = transaction: stock check → decrement → invoice), `GET/PATCH /api/sales/[id]` (record payment) |
| Brand | `GET/PATCH /api/brand` (admin-only settings) |
| Platform | `GET/POST /api/admin/brands`, `PATCH /api/admin/brands/[id]`, `GET/POST /api/admin/users`, `PATCH /api/admin/users/[id]` |

Conventions: JSON in/out; Zod-validated bodies; `401` unauthenticated, `403`
wrong role/inactive, `404` missing, `409` duplicates, `400` business rules
(e.g. `Insufficient stock for "X" — 3 available`).

## 7. Usage monitoring design

- `UsageLog(action, detail, userId, brandId, ip, userAgent, createdAt)` written
  on: LOGIN/LOGOUT/SIGNUP/PASSWORD_RESET + every create/update/delete of
  products/categories/customers/sales/brands/users.
- `User.lastLoginAt` + `User.loginCount` give instant frequency on any list.
- Super admin surfaces: overview KPIs (logins today/7d, login/day chart),
  brand drill-down (team logins, last login), users table (login count), and a
  filterable paginated activity log (action, brand, date range).

## 8. Scale path (10 → 100 users → beyond)

**Stage 0 — today (free, ~$0):** Vercel Hobby + Neon Free. Everything in one
region; daily reports aggregate in JS over ≤ a few thousand rows — fine for
years at 100 users × small catalogues.

**Stage 1 — growth (first paid costs, no re-architecture):**
- Vercel Pro (team, analytics, more compute) — same deploy.
- Neon Scale: larger compute, point-in-time recovery.
- Add Upstash Redis: rate limiting on auth + report caching.
- Move daily-report aggregation to SQL `date_trunc` group-bys when brands pass
  ~100k sale rows (single query, no code-shape change).

**Stage 2 — many brands / heavy usage:**
- Extract reporting into a read replica; background jobs (invoice emails,
  PDFs) via Inngest or a worker container.
- Tenant options: stay shared-schema (fine to thousands of brands) or split
  hot brands to dedicated Neon branches — Prisma supports per-tenant URLs.
- Object storage (Vercel Blob/S3) for PDF/attachment invoices.

Nothing in Stage 0 code is thrown away in Stages 1–2: the transactional core,
auth model, and API contract all carry forward.

## 9. Testing performed (this build)

- Production build: clean compile, full type-check.
- 28 end-to-end checks via HTTP against `next start` + real Postgres:
  landing/auth pages, middleware guards & role separation (brand ↔ admin),
  login (valid/invalid/deactivated), category/product CRUD, oversell
  rejection, sale creation with discount+tax+part-payment, stock decrement,
  invoice render, payment completion (PARTIAL→PAID), cross-brand data
  isolation (0 products leak), brand settings update, super admin brand/user
  creation, login lockout on brand deactivation, last-superadmin guard,
  password reset (mint → use → single-use rejection → new password login),
  signup + duplicate rejection, logout clears session, activity log capturing
  all action types.
