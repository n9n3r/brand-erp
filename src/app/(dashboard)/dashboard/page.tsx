import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Banknote, Receipt, ShoppingCart, TrendingUp, Wallet } from 'lucide-react';
import { requireBrandSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays, money, num, r2, startOfDay, startOfMonth } from '@/lib/format';
import { getTopProducts } from '@/lib/services/reports';
import { Badge, Card, PageHeader, StatCard, StatusBadge, TableWrap } from '@/components/ui';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await requireBrandSession();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const days30 = startOfDay(addDays(now, -29));

  const [brand, sales30, expensesAgg, lowStock, recentSales, topProducts] = await Promise.all([
    prisma.brand.findUnique({ where: { id: session.brandId }, select: { currency: true } }),
    prisma.sale.findMany({
      where: { brandId: session.brandId, soldAt: { gte: days30 } },
      select: { id: true, invoiceNumber: true, soldAt: true, total: true, amountPaid: true, status: true, customer: { select: { name: true } } },
      orderBy: { soldAt: 'desc' },
    }),
    prisma.expense.aggregate({
      where: { brandId: session.brandId, incurredAt: { gte: days30 } },
      _sum: { amount: true },
    }),
    // Reorder check needs quantity <= per-product reorderLevel (a JS filter,
    // not a DB filter) — fine at small-brand catalogue sizes.
    prisma.product.findMany({
      where: { brandId: session.brandId, isActive: true },
      orderBy: { quantity: 'asc' },
      take: 200,
    }),
    prisma.sale.findMany({
      where: { brandId: session.brandId },
      orderBy: { soldAt: 'desc' },
      take: 8,
      include: { customer: { select: { name: true } } },
    }),
    getTopProducts(session.brandId, days30, now, 5),
  ]);

  const currency = brand?.currency ?? 'NGN';
  const revenue30 = r2(sales30.reduce((s, x) => s + num(x.total), 0));
  const outstanding30 = r2(
    sales30.reduce((s, x) => s + Math.max(0, num(x.total) - num(x.amountPaid)), 0),
  );
  const expenses30 = num(expensesAgg._sum.amount);
  const net30 = r2(revenue30 - expenses30);
  const lowStockList = lowStock.filter((p) => p.quantity <= p.reorderLevel).slice(0, 8);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${session.name.split(' ')[0]}`}
        description={`${session.brandName} · last 30 days at a glance`}
      >
        <Link
          href="/sales/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <ShoppingCart className="h-4 w-4" /> New sale
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (30d)" value={money(revenue30, currency)} icon={Banknote} />
        <StatCard
          label="Orders (30d)"
          value={String(sales30.length)}
          icon={Receipt}
          sub={`${money(net30, currency)} net of expenses`}
        />
        <StatCard label="Outstanding (30d)" value={money(outstanding30, currency)} icon={TrendingUp} />
        <StatCard label="Expenses (30d)" value={money(expenses30, currency)} icon={Wallet} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent sales</h2>
            <Link href="/invoices" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              All invoices →
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              No sales yet — record your first sale to see it here.
            </p>
          ) : (
            <TableWrap className="rounded-none border-0">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Invoice</th>
                  <th className="th">Customer</th>
                  <th className="th text-right">Total</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentSales.map((s) => (
                  <tr key={s.id} className="transition hover:bg-slate-50">
                    <td className="td font-medium">
                      <Link href={`/invoices/${s.id}`} className="text-brand-600 hover:text-brand-700">
                        {s.invoiceNumber}
                      </Link>
                    </td>
                    <td className="td text-slate-500">{s.customer?.name ?? 'Walk-in customer'}</td>
                    <td className="td text-right font-semibold">{money(num(s.total), currency)}</td>
                    <td className="td">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Low stock
            </h2>
            {lowStockList.length === 0 ? (
              <p className="text-sm text-slate-500">All stocked — nothing at or below its reorder level.</p>
            ) : (
              <ul className="space-y-2.5">
                {lowStockList.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-700">{p.name}</span>
                    <Badge tone={p.quantity === 0 ? 'red' : 'amber'}>
                      {p.quantity} left
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/inventory" className="mt-3 block text-xs font-medium text-brand-600 hover:text-brand-700">
              Manage inventory →
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Top products (30d)</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-slate-500">No sales in this period yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {topProducts.map((p, i) => (
                  <li key={p.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-700">
                      <span className="mr-1.5 text-xs text-slate-400">{i + 1}.</span>
                      {p.name}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-900">
                      {money(p.revenue, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/reports" className="mt-3 block text-xs font-medium text-brand-600 hover:text-brand-700">
              Full reports →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
