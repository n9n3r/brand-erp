# Security Update — 2026-08 · Session Invalidation, Email Verification, Password Policy

Copy the files below into your repo, run `npm run db:push`, and redeploy.
**No new dependencies. No new environment variables** (`RESEND_API_KEY` remains
optional — without it, verification links are logged to the server console and
the in-app banner offers a resend).

---

## NEW files (4)

| File | Purpose |
|---|---|
| `src/lib/password-policy.ts` | Password policy shared by client UI + server: 10–72 chars, letter+number required, no leading/trailing spaces, ~150-entry common-password blocklist, personal-info (email/name) detector. Exports `strongPasswordSchema` (Zod), `validatePassword`, `PASSWORD_RULES`. |
| `src/lib/email-verification.ts` | Verification token service: 32-byte random tokens stored as SHA-256 hashes, single-use, 24h expiry, issuing a new one invalidates the old. |
| `src/app/api/auth/verify-email/route.ts` | `GET ?token=…` — the email link; verifies + redirects to `/login?verified=1` (or `?verifyFailed=1`). `POST` — resend the email (auth required; logged-in unverified users only). |
| `src/components/verify-email-banner.tsx` | Amber in-app banner for unverified users, with a Resend button. |

## EDITED files (16) — all surgical

| File | Change |
|---|---|
| `prisma/schema.prisma` | `User.emailVerifiedAt DateTime?`, `User.tokenVersion Int @default(0)`, new `EmailVerificationToken` model |
| `src/lib/jwt.ts` | `tv?: number` added to session payload |
| `src/lib/api-auth.ts` | `requireApiUser()` now rejects JWTs whose `tv` ≠ the user's current `tokenVersion` (401 "Session expired…") |
| `src/app/api/auth/login/route.ts` | signs `tv: user.tokenVersion` into new JWTs |
| `src/app/api/auth/signup/route.ts` | sends verification email after signup; includes `tv` |
| `src/app/api/auth/reset-password/route.ts` | password reset bumps `tokenVersion` → **all sessions die** |
| `src/app/api/admin/users/[id]/route.ts` | admin password change bumps `tokenVersion` → **that user's sessions die** |
| `src/lib/validation.ts` | `strongPasswordSchema` replaces `.min(8)` on signup/reset/admin-user schemas; signup also rejects passwords containing the user's email/name |
| `src/app/(dashboard)/layout.tsx` | session-version check (redirect `?error=expired`) + renders `VerifyEmailBanner` |
| `src/app/(admin)/admin/layout.tsx` | session-version check |
| `src/app/(auth)/login/page.tsx` | handles `?verified=1` (success) / `?verifyFailed=1` / `?error=expired` |
| `src/app/(auth)/login/login-form.tsx` | shows the info/success message; accepts `initialInfo` prop |
| `src/app/(auth)/signup/signup-form.tsx` | live password-requirement checklist (green ticks) using the shared policy |
| `src/app/(auth)/reset-password/[token]/reset-form.tsx` | hints + minLength updated to 10 |
| `src/app/(admin)/admin/users/page.tsx` | exposes `emailVerified` per user |
| `src/app/(admin)/admin/users/users-client.tsx` | “unverified email” badge; password inputs updated to the new policy |
| `prisma/seed.ts` | seeded accounts are created pre-verified |

## Behaviour after update

- **Signup**: strong password enforced (client checklist + server); a
  verification email is sent; the user can work normally but sees an amber
  banner until verified. Verification link works once, expires in 24h.
- **Password reset (self-service or admin-set)**: all of that user's existing
  sessions are immediately invalidated (server-side check on every request —
  edge middleware still routes, but no API/page will serve them).
- **Admin console**: users list shows an amber “unverified email” badge.

## Deploy steps (Vercel + Neon)

```bash
# 1. copy the files above into your repo

# 2. apply the additive schema change (safe — no data touched)
DATABASE_URL="<your-neon-pooled-url>" npm run db:push

# 3. OPTIONAL — treat pre-existing accounts as verified so they don't see the
#    banner (run once, e.g. via psql or Neon's SQL editor):
#    UPDATE "User" SET "emailVerifiedAt" = now();

# 4. commit + push → Vercel rebuilds automatically
```

## Verified by test (14 checks)

Weak/common/no-digit/personal-info passwords rejected (4×400) · strong signup
201 + banner visible · verification link works and is single-use · banner
disappears after verifying · admin password change kills the target's session
(401) · self-service reset kills own session (401) · old passwords rejected ·
seeded accounts unaffected · resend endpoint refuses to leak dev links in
production.
