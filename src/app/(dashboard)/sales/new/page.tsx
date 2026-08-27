import type { Metadata } from 'next';
import { requireBrandSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { num } from '@/lib/format';
import { NewSaleClient } from './new-sale-client';

export const metadata: Metadata = { title: 'New sale' };

export default async function NewSalePage() {
  const session = await requireBrandSession();

  const [brand, products, customers] = await Promise.all([
    prisma.brand.findUnique({ where: { id: session.brandId }, select: { currency: true } }),
    prisma.product.findMany({
      where: { brandId: session.brandId, isActive: true, quantity: { gt: 0 } },
      orderBy: { name: 'asc' },
      take: 300,
      include: { category: { select: { name: true } } },
    }),
    prisma.customer.findMany({
      where: { brandId: session.brandId },
      orderBy: { name: 'asc' },
      take: 300,
      select: { id: true, name: true },
    }),
  ]);

  return (
    <NewSaleClient
      currency={brand?.currency ?? 'NGN'}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        categoryName: p.category?.name ?? null,
        price: num(p.price),
        stock: p.quantity,
      }))}
      customers={customers}
    />
  );
}
