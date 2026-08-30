import type { Metadata } from 'next';
import { requireBrandSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { num } from '@/lib/format';
import { InventoryClient } from './inventory-client';

export const metadata: Metadata = { title: 'Inventory' };

export type InventoryProductRow = {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string | null;
  categoryName: string | null;
  description: string | null;
  price: number;
  costPrice: number | null;
  quantity: number;
  reorderLevel: number;
  isActive: boolean;
};

export type InventoryCategoryRow = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
};

export default async function InventoryPage() {
  const session = await requireBrandSession();

  const [brand, products, categories] = await Promise.all([
    prisma.brand.findUnique({ where: { id: session.brandId }, select: { currency: true } }),
    prisma.product.findMany({
      where: { brandId: session.brandId },
      orderBy: { name: 'asc' },
      include: { category: { select: { name: true } } },
    }),
    prisma.category.findMany({
      where: { brandId: session.brandId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
  ]);

  const productsRow: InventoryProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    description: p.description,
    price: num(p.price),
    costPrice: p.costPrice === null ? null : num(p.costPrice),
    quantity: p.quantity,
    reorderLevel: p.reorderLevel,
    isActive: p.isActive,
  }));

  const categoriesRow: InventoryCategoryRow[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    productCount: c._count.products,
  }));

  return (
    <InventoryClient
      products={productsRow}
      categories={categoriesRow}
      currency={brand?.currency ?? 'NGN'}
    />
  );
}
