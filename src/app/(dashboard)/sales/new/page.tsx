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
      where: { brandId: session.brandId, isActive: true },
      orderBy: { name: 'asc' },
      include: { category: { select: { name: true } } },
    }),
    prisma.customer.findMany({
      where: { brandId: session.brandId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: num(p.price),
    quantity: p.quantity,
    categoryName: p.category?.name ?? null,
  }));

  const customerOptions = customers.map((c) => ({ id: c.id, name: c.name }));

  return (
    <NewSaleClient
      products={productOptions}
      customers={customerOptions}
      currency={brand?.currency ?? 'NGN'}
    />
  );
}
