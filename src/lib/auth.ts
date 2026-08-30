import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySession } from '@/lib/jwt';

export type BrandSession = {
  sub: string;
  name: string;
  email: string;
  role: 'BRAND_ADMIN' | 'BRAND_USER';
  brandId: string;
  brandName: string;
  tv: number;
  emailVerifiedAt: Date | null;
};

export type AdminSession = {
  sub: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN';
  tv: number;
};

async function loadSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return { kind: 'missing' as const };

  const session = await verifySession(token);
  if (!session) return { kind: 'invalid' as const };

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      role: true,
      tokenVersion: true,
      brandId: true,
      emailVerifiedAt: true,
      brand: { select: { id: true, name: true, isActive: true } },
    },
  });
  if (!user || !user.isActive) return { kind: 'invalid' as const };
  if (user.tokenVersion !== session.tv) return { kind: 'expired' as const };
  return { kind: 'ok' as const, user };
}

/** RSC guard for brand workspace pages. */
export async function requireBrandSession(): Promise<BrandSession> {
  const loaded = await loadSession();
  if (loaded.kind === 'missing') redirect('/login');
  if (loaded.kind === 'invalid') redirect('/login');
  if (loaded.kind === 'expired') redirect('/login?error=expired');

  const { user } = loaded;
  if (user.role === 'SUPER_ADMIN') redirect('/admin');
  if (!user.brand || !user.brand.isActive) redirect('/login?error=expired');

  return {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    brandId: user.brand.id,
    brandName: user.brand.name,
    tv: user.tokenVersion,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

/** RSC guard for the super-admin console. */
export async function requireAdminSession(): Promise<AdminSession> {
  const loaded = await loadSession();
  if (loaded.kind === 'missing') redirect('/login');
  if (loaded.kind === 'invalid') redirect('/login');
  if (loaded.kind === 'expired') redirect('/login?error=expired');

  const { user } = loaded;
  if (user.role !== 'SUPER_ADMIN') redirect('/dashboard');

  return {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: 'SUPER_ADMIN',
    tv: user.tokenVersion,
  };
}
