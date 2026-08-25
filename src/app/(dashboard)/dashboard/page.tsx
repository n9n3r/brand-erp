import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Banknote, Receipt, ShoppingBag, TrendingUp } from 'lucide-react';
import { requireBrandSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays, fmtDate, money, num, startOfDay } from '@/lib/format';
import {
  getDailySales,
  getLowStock,
  getRecentSales,
  getSalesSummary,
  getTodayStats,
} from '@/lib/services/reports';
import { Card, PageHeader, StatCard, StatusBadge, TableWrap, Badge, Button, EmptyState } from '@/components/ui';
import { RevenueAreaChart } from '@/components/charts';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await requireBrandSession();
  const brandId = session.brandId;
  const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { currency: true, name: true } });
  const currency = brand?.currency ?? 'NGN';

  const now = new Date();
  const from30 = startOfDay(addDays(now, -29));
  const to = now;

  const [summary, today, daily, lowStock, recentSales, productCount, customerCount] = await Promise.all([
    getSalesSummary(brandId, from30, to),
    getTodayStats(brandId),
    getDailySales(brandId, from30, to),
    getLowStock(brandId, 6),
    getRecentSales(brandId, 8),
    prisma.product.count({ where: { brandId, isActive: true } }),
    prisma.customer.count({ where: { brandId } }),
  ]);

  return (
    <div>
      <PageHeader title="Dashboard" description={`The last 30 days at ${brand?.name ?? 'your brand'}`}>
        <Link href="/sales/new">
          <Button>
            <ShoppingBag className="h-4 w-4" /> New sale
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue (30d)"
          value={money(summary.revenue, currency)}
          sub={`Today: ${money(today.revenue, currency)}`}
          icon={Banknote}
        />
        <StatCard label="Orders (30d)" value={String(summary.orders)} sub={`${summary.itemsSold} items sold`} icon={Receipt} />
        <StatCard
          label="Avg. order (30d)"
          value={money(summary.avgOrder, currency)}
          sub={`Outstanding: ${money(summary.outstanding, currency)}`}
          icon={TrendingUp}
        />
        <StatCard label="Catalogue" value={String(productCount)} sub={`${customerCount} customers`} icon={ShoppingBag} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Revenue trend</h2>
            <Link href="/reports" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Full report →
            </Link>
          </div>
          <RevenueAreaChart data={daily} />
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Low stock</h2>
            <Link href="/inventory" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Inventory →
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">All stock levels are healthy 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.category?.name ?? 'Uncategorised'}</p>
                  </div>
                  <Badge tone={p.quantity === 0 ? 'red' : 'amber'}>
                    <AlertTriangle className="mr-1 h-3 w-3" /> {p.quantity} left
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent invoices</h2>
          <Link href="/invoices" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            View all →
          </Link>
        </div>
        {recentSales.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No sales yet"
            description="Record your first sale and the invoice will appear here."
          >
            <Link href="/sales/new">
              <Button>Record a sale</Button>
            </Link>
          </EmptyState>
        ) : (
          <TableWrap>
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Invoice</th>
                <th className="th">Date</th>
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
                  <td className="td">{fmtDate(s.soldAt)}</td>
                  <td className="td">{s.customer?.name ?? 'Walk-in customer'}</td>
                  <td className="td text-right font-semibold">{money(num(s.total), currency)}</td>
                  <td className="td">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </div>
    </div>
  );
}
