import type { Metadata } from 'next';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UsersClient } from './users-client';

export const metadata: Metadata = { title: 'Users' };

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'BRAND_ADMIN' | 'BRAND_USER';
  isActive: boolean;
  loginCount: number;
  lastLoginAt: string | null;
  brandId: string | null;
  brandName: string | null;
};

export default async function AdminUsersPage() {
  const session = await requireAdminSession();
  const [users, brands] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        loginCount: true,
        lastLoginAt: true,
        brand: { select: { id: true, name: true } },
      },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    loginCount: u.loginCount,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    brandId: u.brand?.id ?? null,
    brandName: u.brand?.name ?? null,
  }));

  return <UsersClient users={rows} brands={brands} currentUserId={session.sub} />;
}
