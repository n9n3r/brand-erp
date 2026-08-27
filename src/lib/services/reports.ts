import { prisma } from '@/lib/prisma';
import { addDays, dayKey, num, r2, startOfDay } from '@/lib/format';

/** Aggregates for the Reports page (revenue, orders, avg, outstanding, status split). */
export async function getSalesSummary(brandId: string, from: Date, to: Date) {
  const sales = await prisma.sale.findMany({
    where: { brandId, soldAt: { gte: from, lte: to } },
    select: { total: true, amountPaid: true, status: true, items: { select: { quantity: true } } },
  });
  const orders = sales.length;
  const revenue = r2(sales.reduce((s, x) => s + num(x.total), 0));
  const outstanding = r2(
    sales.reduce((s, x) => s + Math.max(0, num(x.total) - num(x.amountPaid)), 0),
  );
  const itemsSold = sales.reduce((s, x) => s + x.items.reduce((a, i) => a + i.quantity, 0), 0);
  return {
    revenue,
    orders,
    itemsSold,
    avgOrder: orders ? r2(revenue / orders) : 0,
    outstanding,
    paid: sales.filter((x) => x.status === 'PAID').length,
    partial: sales.filter((x) => x.status === 'PARTIAL').length,
    unpaid: sales.filter((x) => x.status === 'UNPAID').length,
  };
}

/** Revenue per day with zero-filled gaps, for the area chart. */
export async function getDailySales(brandId: string, from: Date, to: Date) {
  const sales = await prisma.sale.findMany({
    where: { brandId, soldAt: { gte: from, lte: to } },
    select: { total: true, soldAt: true },
  });
  const byDay = new Map<string, number>();
  for (const s of sales) {
    const k = dayKey(s.soldAt);
    byDay.set(k, (byDay.get(k) ?? 0) + num(s.total));
  }
  const out: { date: string; revenue: number }[] = [];
  for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
    const k = dayKey(d);
    out.push({ date: k, revenue: r2(byDay.get(k) ?? 0) });
  }
  return out;
}

/** Top products by revenue within the period (grouped by snapshot name). */
export async function getTopProducts(brandId: string, from: Date, to: Date, limit = 10) {
  const items = await prisma.saleItem.findMany({
    where: { sale: { brandId, soldAt: { gte: from, lte: to } } },
    select: { productName: true, quantity: true, lineTotal: true },
  });
  const agg = new Map<string, { quantity: number; revenue: number }>();
  for (const i of items) {
    const a = agg.get(i.productName) ?? { quantity: 0, revenue: 0 };
    a.quantity += i.quantity;
    a.revenue += num(i.lineTotal);
    agg.set(i.productName, a);
  }
  return [...agg.entries()]
    .map(([name, a]) => ({ name, quantity: a.quantity, revenue: r2(a.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
