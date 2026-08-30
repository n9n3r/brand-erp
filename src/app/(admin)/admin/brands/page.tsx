import type { Metadata } from 'next';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BrandsClient } from './brands-client';

export const metadata: Metadata = { title: 'Brands' };

export type AdminBrandRow = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  users: number;
  products: number;
  sales: number;
};

export default async function AdminBrandsPage() {
  await requireAdminSession();

  const brands = await prisma.brand.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { users: true, products: true, sales: true } } },
  });

  const rows: AdminBrandRow[] = brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    currency: b.currency,
    isActive: b.isActive,
    createdAt: b.createdAt.toISOString(),
    users: b._count.users,
    products: b._count.products,
    sales: b._count.sales,
  }));

  return <BrandsClient brands={rows} />;
}
