import { prisma } from '@/lib/prisma';
import { addDays, dayKey, num, r2, startOfDay } from '@/lib/format';

export type DailyPoint = { date: string; label: string; revenue: number; orders: number };

export type SalesSummary = {
  revenue: number;
  orders: number;
  itemsSold: number;
  avgOrder: number;
  paid: number;
  partial: number;
  unpaid: number;
  outstanding: number;
};

/** Aggregate sales figures for a brand over [from, to]. */
export async function getSalesSummary(brandId: string, from: Date, to: Date): Promise<SalesSummary> {
  const [sales, itemsAgg] = await Promise.all([
    prisma.sale.findMany({
      where: { brandId, soldAt: { gte: from, lte: to } },
      select: { total: true, amountPaid: true, status: true },
    }),
    prisma.saleItem.aggregate({
      where: { sale: { brandId, soldAt: { gte: from, lte: to } } },
      _sum: { quantity: true },
    }),
  ]);
  const revenue = r2(sales.reduce((sum, s) => sum + num(s.total), 0));
  const orders = sales.length;
  const outstanding = r2(sales.reduce((sum, s) => sum + Math.max(0, num(s.total) - num(s.amountPaid)), 0));
  return {
    revenue,
    orders,
    itemsSold: num(itemsAgg._sum.quantity),
    avgOrder: orders ? r2(revenue / orders) : 0,
    paid: sales.filter((s) => s.status === 'PAID').length,
    partial: sales.filter((s) => s.status === 'PARTIAL').length,
    unpaid: sales.filter((s) => s.status === 'UNPAID').length,
    outstanding,
  };
}

/** Daily revenue series with gap-filling between from..to. */
export async function getDailySales(brandId: string, from: Date, to: Date): Promise<DailyPoint[]> {
  const sales = await prisma.sale.findMany({
    where: { brandId, soldAt: { gte: from, lte: to } },
    select: { soldAt: true, total: true },
  });
  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (const s of sales) {
    const key = dayKey(s.soldAt);
    const b = buckets.get(key) || { revenue: 0, orders: 0 };
    b.revenue = r2(b.revenue + num(s.total));
    b.orders += 1;
    buckets.set(key, b);
  }
  const points: DailyPoint[] = [];
  const days = Math.min(366, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  for (let i = 0; i < days; i++) {
    const d = addDays(startOfDay(from), i);
    const key = dayKey(d);
    const b = buckets.get(key);
    points.push({
      date: key,
      label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      revenue: b?.revenue ?? 0,
      orders: b?.orders ?? 0,
    });
  }
  return points;
}

export type TopProduct = { name: string; quantity: number; revenue: number };

export async function getTopProducts(brandId: string, from: Date, to: Date, take = 10): Promise<TopProduct[]> {
  const items = await prisma.saleItem.findMany({
    where: { sale: { brandId, soldAt: { gte: from, lte: to } } },
    select: { productName: true, quantity: true, lineTotal: true },
  });
  const byName = new Map<string, TopProduct>();
  for (const it of items) {
    const cur = byName.get(it.productName) || { name: it.productName, quantity: 0, revenue: 0 };
    cur.quantity += it.quantity;
    cur.revenue = r2(cur.revenue + num(it.lineTotal));
    byName.set(it.productName, cur);
  }
  return [...byName.values()].sort((a, b) => b.revenue - a.revenue).slice(0, take);
}

export async function getLowStock(brandId: string, take = 8) {
  return prisma.product.findMany({
    where: { brandId, isActive: true, quantity: { lte: prisma.product.fields.reorderLevel } },
    orderBy: { quantity: 'asc' },
    take,
    select: { id: true, name: true, quantity: true, reorderLevel: true, category: { select: { name: true } } },
  });
}

export async function getRecentSales(brandId: string, take = 8) {
  return prisma.sale.findMany({
    where: { brandId },
    orderBy: { soldAt: 'desc' },
    take,
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      status: true,
      soldAt: true,
      customer: { select: { name: true } },
    },
  });
}

export async function getTodayStats(brandId: string) {
  const today = startOfDay(new Date());
  const [agg] = await Promise.all([
    prisma.sale.aggregate({
      where: { brandId, soldAt: { gte: today } },
      _sum: { total: true },
      _count: true,
    }),
  ]);
  return { revenue: num(agg._sum.total), orders: agg._count };
}
