import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays, fmtDate, num, startOfDay } from '@/lib/format';
import { Badge } from '@/components/ui';
import { BrandsClient } from './brands-client';

export const metadata: Metadata = { title: 'Brands' };

export default async function AdminBrandsPage() {
  await requireAdminSession();
  const start30d = startOfDay(addDays(new Date(), -29));

  const [brands, sales30] = await Promise.all([
    prisma.brand.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, products: true, customers: true } } },
    }),
    prisma.sale.groupBy({
      by: ['brandId'],
      where: { soldAt: { gte: start30d } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const revenueMap = new Map(sales30.map((s) => [s.brandId, { revenue: num(s._sum.total), orders: s._count }]));

  const rows = brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    currency: b.currency,
    description: b.description,
    isActive: b.isActive,
    users: b._count.users,
    products: b._count.products,
    customers: b._count.customers,
    createdAt: fmtDate(b.createdAt),
    revenue30: revenueMap.get(b.id)?.revenue ?? 0,
    orders30: revenueMap.get(b.id)?.orders ?? 0,
  }));

  return (
    <div>
      <BrandsClient brands={rows} />
      <p className="mt-4 text-xs text-slate-400">
        Deactivating a brand locks out all its users. Click a brand to edit its details.{' '}
        <Link href="/admin/users" className="text-brand-600 hover:underline">
          Manage users →
        </Link>
      </p>
    </div>
  );
}
