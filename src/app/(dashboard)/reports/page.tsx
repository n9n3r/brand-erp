import type { Metadata } from 'next';
import Link from 'next/link';
import { Banknote, Receipt, ShoppingBag, TrendingUp } from 'lucide-react';
import { requireBrandSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays, endOfDay, fmtDate, money, num, startOfDay } from '@/lib/format';
import { getDailySales, getSalesSummary, getTopProducts } from '@/lib/services/reports';
import { Badge, Button, Card, PageHeader, StatCard, TableWrap } from '@/components/ui';
import { RevenueAreaChart } from '@/components/charts';
import { CsvButton } from '@/components/csv-button';

export const metadata: Metadata = { title: 'Reports' };

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const session = await requireBrandSession();
  const brand = await prisma.brand.findUnique({
    where: { id: session.brandId },
    select: { currency: true },
  });
  const currency = brand?.currency ?? 'NGN';

  const to = searchParams.to ? endOfDay(new Date(searchParams.to)) : endOfDay(new Date());
  const from = searchParams.from ? startOfDay(new Date(searchParams.from)) : startOfDay(addDays(new Date(), -29));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return (
      <div>
        <PageHeader title="Reports" />
        <Card className="p-6 text-sm text-slate-600">Invalid date range.</Card>
      </div>
    );
  }

  const [summary, daily, topProducts, salesForExport, expensesAgg] = await Promise.all([
    getSalesSummary(session.brandId, from, to),
    getDailySales(session.brandId, from, to),
    getTopProducts(session.brandId, from, to, 10),
    prisma.sale.findMany({
      where: { brandId: session.brandId, soldAt: { gte: from, lte: to } },
      orderBy: { soldAt: 'desc' },
      select: {
        invoiceNumber: true,
        soldAt: true,
        customer: { select: { name: true } },
        total: true,
        amountPaid: true,
        status: true,
        items: { select: { quantity: true } },
      },
    }),
    prisma.expense.aggregate({
      where: { brandId: session.brandId, incurredAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
  ]);
  const expensesTotal = num(expensesAgg._sum.amount);
  const net = summary.revenue - expensesTotal;

  const csvRows: Array<Array<string | number>> = salesForExport.map((s) => [
    s.invoiceNumber,
    isoDay(s.soldAt),
    s.customer?.name ?? 'Walk-in',
    s.items.reduce((sum, i) => sum + i.quantity, 0),
    num(s.total),
    num(s.amountPaid),
    s.status,
  ]);

  return (
    <div>
      <PageHeader title="Reports" description={`Sales performance · ${fmtDate(from)} → ${fmtDate(to)}`}>
        <CsvButton
          headers={['Invoice', 'Date', 'Customer', 'Items', 'Total', 'Paid', 'Status']}
          rows={csvRows}
          filename={`sales-report_${isoDay(from)}_to_${isoDay(to)}.csv`}
          label="Export CSV"
        />
      </PageHeader>

      <form action="/reports" method="GET" className="mb-6 flex flex-wrap items-end gap-2">
        <div>
          <label className="label">From</label>
          <input type="date" name="from" defaultValue={isoDay(from)} className="input sm:w-44" />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" name="to" defaultValue={isoDay(to)} className="input sm:w-44" />
        </div>
        <Button type="submit" variant="secondary">Apply range</Button>
        <Link href="/reports" className="mb-2 text-xs font-medium text-slate-500 hover:text-slate-800">
          Reset to last 30 days
        </Link>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={money(summary.revenue, currency)} icon={Banknote} />
        <StatCard label="Orders" value={String(summary.orders)} sub={`${summary.itemsSold} items sold`} icon={Receipt} />
        <StatCard label="Average order" value={money(summary.avgOrder, currency)} icon={TrendingUp} />
        <StatCard
          label="Outstanding"
          value={money(summary.outstanding, currency)}
          sub={`${summary.unpaid} unpaid · ${summary.partial} partial`}
          icon={ShoppingBag}
        />
        <StatCard
          label="Expenses (period)"
          value={money(expensesTotal, currency)}
          sub="recorded in Expenses"
          icon={ShoppingBag}
        />
        <StatCard
          label="Net (revenue − expenses)"
          value={money(net, currency)}
          sub={net >= 0 ? 'profitable period' : 'loss over period'}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <h2 className="mb-3 font-semibold text-slate-900">Revenue over time</h2>
          <RevenueAreaChart data={daily} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Payment status</h2>
          <ul className="space-y-3">
            {[
              ['Paid', summary.paid, 'green'],
              ['Partially paid', summary.partial, 'amber'],
              ['Unpaid', summary.unpaid, 'red'],
            ].map(([label, count, tone]) => {
              const totalOrders = Math.max(1, summary.orders);
              const pct = Math.round((Number(count) / totalOrders) * 100);
              return (
                <li key={String(label)}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <Badge tone={tone as 'green' | 'amber' | 'red'}>{String(label)}</Badge>
                    </span>
                    <span className="font-semibold text-slate-800">
                      {count} <span className="text-xs font-normal text-slate-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        tone === 'green' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-semibold text-slate-900">Top products</h2>
        {topProducts.length === 0 ? (
          <Card className="p-6 text-sm text-slate-500">No sales in this period.</Card>
        ) : (
          <TableWrap>
            <thead className="bg-slate-50">
              <tr>
                <th className="th">#</th>
                <th className="th">Product</th>
                <th className="th text-right">Units sold</th>
                <th className="th text-right">Revenue</th>
                <th className="th text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {topProducts.map((p, i) => (
                <tr key={p.name} className="transition hover:bg-slate-50">
                  <td className="td text-slate-400">{i + 1}</td>
                  <td className="td font-medium text-slate-900">{p.name}</td>
                  <td className="td text-right">{p.quantity}</td>
                  <td className="td text-right font-semibold">{money(p.revenue, currency)}</td>
                  <td className="td text-right text-slate-500">
                    {summary.revenue > 0 ? `${Math.round((p.revenue / summary.revenue) * 100)}%` : '—'}
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
