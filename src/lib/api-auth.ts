import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySession, type Session } from '@/lib/jwt';
import { ApiError } from '@/lib/api';

/**
 * Load + re-validate the session against the database on every API request:
 * account exists, is active, brand is active, and the JWT's tokenVersion (tv)
 * matches — so password resets / admin password sets kill old sessions even
 * though the JWT itself is still unexpired (see CHANGELOG-SECURITY.md).
 */
async function loadSession(): Promise<Session> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) throw new ApiError(401, 'Not signed in');
  const session = await verifySession(token);
  if (!session) throw new ApiError(401, 'Session expired — please sign in again');

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      isActive: true,
      role: true,
      tokenVersion: true,
      brandId: true,
      brand: { select: { isActive: true } },
    },
  });
  if (!user) throw new ApiError(401, 'Account no longer exists');
  if (user.tokenVersion !== session.tv) {
    throw new ApiError(401, 'Session expired — your password was changed. Sign in again');
  }
  if (!user.isActive) throw new ApiError(403, 'This account is deactivated');
  if (user.role !== 'SUPER_ADMIN') {
    if (!user.brand || !user.brand.isActive) throw new ApiError(403, 'This brand is deactivated');
  }
  return { sub: user.id, role: user.role, brandId: user.brandId, tv: user.tokenVersion };
}

export const requireApiUser = loadSession;

export type BrandSession = Session & { brandId: string };

export async function requireApiBrandUser(): Promise<BrandSession> {
  const s = await loadSession();
  if (s.role === 'SUPER_ADMIN') throw new ApiError(403, 'Super admins do not operate in a brand workspace');
  if (!s.brandId) throw new ApiError(403, 'No brand associated with this account');
  return { sub: s.sub, role: s.role, brandId: s.brandId, tv: s.tv };
}

export async function requireApiBrandAdmin(): Promise<BrandSession> {
  const s = await requireApiBrandUser();
  if (s.role !== 'BRAND_ADMIN') throw new ApiError(403, 'Brand admin access required');
  return s;
}

export async function requireApiSuperAdmin(): Promise<Session> {
  const s = await loadSession();
  if (s.role !== 'SUPER_ADMIN') throw new ApiError(403, 'Super admin access required');
  return s;
}
