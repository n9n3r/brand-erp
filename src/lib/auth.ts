// Server-side session helpers for React Server Components (pages/layouts).
// These read the session cookie and redirect when appropriate.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySession, type SessionPayload } from '@/lib/jwt';
import type { BrandSession } from '@/lib/api-auth';

export { type BrandSession };

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

/** For brand-area layouts/pages. Redirects super admins to /admin. */
export async function requireBrandSession(): Promise<BrandSession> {
  const session = await requireSession();
  if (session.role === 'SUPER_ADMIN' || !session.brandId) redirect('/admin');
  return session as BrandSession;
}

/** For admin-area layouts/pages. Redirects brand users to /dashboard. */
export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== 'SUPER_ADMIN') redirect('/dashboard');
  return session;
}
