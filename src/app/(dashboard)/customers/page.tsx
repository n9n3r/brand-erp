import type { Metadata } from 'next';
import { requireBrandSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { num, r2 } from '@/lib/format';
import { CustomersClient } from './customers-client';

export const metadata: Metadata = { title: 'Customers' };

export type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  orderCount: number;
  lifetimeSpend: number;
};

export default async function CustomersPage() {
  const session = await requireBrandSession();

  const [brand, customers] = await Promise.all([
    prisma.brand.findUnique({ where: { id: session.brandId }, select: { currency: true } }),
    prisma.customer.findMany({
      where: { brandId: session.brandId },
      orderBy: { name: 'asc' },
      take: 300,
      include: { _count: { select: { sales: true } }, sales: { select: { total: true } } },
    }),
  ]);

  const rows: CustomerRow[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    orderCount: c._count.sales,
    lifetimeSpend: r2(c.sales.reduce((s, x) => s + num(x.total), 0)),
  }));

  return <CustomersClient customers={rows} currency={brand?.currency ?? 'NGN'} />;
}
