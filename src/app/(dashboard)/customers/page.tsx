import type { Metadata } from 'next';
import { requireBrandSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { num } from '@/lib/format';
import { CustomersClient } from './customers-client';

export const metadata: Metadata = { title: 'Customers' };

export type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  orders: number;
  totalSpend: number;
};

export default async function CustomersPage() {
  const session = await requireBrandSession();
  const customers = await prisma.customer.findMany({
    where: { brandId: session.brandId },
    orderBy: { createdAt: 'desc' },
    include: { sales: { select: { total: true } } },
  });

  const rows: CustomerRow[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    orders: c.sales.length,
    totalSpend: num(c.sales.reduce((sum, s) => sum + num(s.total), 0)),
  }));

  return <CustomersClient customers={rows} />;
}
