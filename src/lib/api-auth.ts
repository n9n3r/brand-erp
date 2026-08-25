import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySession, type SessionPayload } from '@/lib/jwt';
import { ApiError } from '@/lib/api';

export type BrandSession = SessionPayload & { brandId: string };

export async function getApiSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Any authenticated, active user. */
export async function requireApiUser(): Promise<SessionPayload> {
  const session = await getApiSession();
  if (!session) throw new ApiError(401, 'Not authenticated');
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isActive: true, tokenVersion: true, brand: { select: { isActive: true } } },
  });
  if (!user || !user.isActive) throw new ApiError(401, 'Your account has been deactivated');
  // Session versioning: password resets/changes bump tokenVersion, which
  // immediately invalidates every JWT issued before the change.
  if ((session.tv ?? 0) !== user.tokenVersion) {
    throw new ApiError(401, 'Session expired after a password change — please log in again');
  }
  return session;
}

/** Authenticated staff user bound to an active brand (brand area APIs). */
export async function requireApiBrandUser(): Promise<BrandSession> {
  const session = await requireApiUser();
  if (!session.brandId) throw new ApiError(403, 'Super admins must use the admin area');
  const brand = await prisma.brand.findUnique({
    where: { id: session.brandId },
    select: { isActive: true },
  });
  if (!brand?.isActive) throw new ApiError(403, 'This brand has been deactivated');
  return session as BrandSession;
}

/** Brand administrator (manage brand settings). */
export async function requireApiBrandAdmin(): Promise<BrandSession> {
  const session = await requireApiBrandUser();
  if (session.role !== 'BRAND_ADMIN') {
    throw new ApiError(403, 'Only brand administrators can perform this action');
  }
  return session;
}

/** Platform super admin. */
export async function requireApiSuperAdmin(): Promise<SessionPayload> {
  const session = await requireApiUser();
  if (session.role !== 'SUPER_ADMIN') throw new ApiError(403, 'Super admin access required');
  return session;
}
