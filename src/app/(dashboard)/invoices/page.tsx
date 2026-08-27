import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { requireBrandSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fmtDate, money, num } from '@/lib/format';
import { Badge, EmptyState, PageHeader, StatusBadge, TableWrap } from '@/components/ui';

export const metadata: Metadata = { title: 'Invoices' };

const STATUSES = ['ALL', 'PAID', 'PARTIAL', 'UNPAID'] as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const session = await requireBrandSession();
  const status = (STATUSES as readonly string[]).includes(searchParams.status ?? '')
    ? (searchParams.status as (typeof STATUSES)[number])
    : 'ALL';
  const q = (searchParams.q ?? '').trim();

  const sales = await prisma.sale.findMany({
    where: {
      brandId: session.brandId,
      ...(status !== 'ALL' ? { status } : {}),
      ...(q
        ? {
            OR: [
              { invoiceNumber: { contains: q, mode: 'insensitive' } },
              { customer: { name: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    orderBy: { soldAt: 'desc' },
    take: 100, // ⚠️ totals below are computed over this capped set only — see ERRORS_AND_SOLUTIONS.md (B-3)
    include: { customer: { select: { name: true } }, _count: { select: { items: true } } },
  });

  const brand = await prisma.brand.findUnique({
    where: { id: session.brandId },
    select: { currency: true },
  });
  const currency = brand?.currency ?? 'NGN';

  const totals = sales.reduce(
    (acc, s) => ({
      total: acc.total + num(s.total),
      outstanding: acc.outstanding + Math.max(0, num(s.total) - num(s.amountPaid)),
    }),
    { total: 0, outstanding: 0 }
  );

  return (
    <div>
      <PageHeader title="Invoices" description="Every sale, stored with a unique invoice number.">
        <Link
          href="/sales/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          New sale
        </Link>
      </PageHeader>

      <form className="mb-4 flex flex-col gap-2 sm:flex-row" action="/invoices" method="GET">
        <select name="status" defaultValue={status} className="input sm:w-44">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={q} className="input sm:max-w-xs" placeholder="Search invoice # or customer…" />
        <button
          type="submit"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Filter
        </button>
        <div className="sm:ml-auto sm:self-center">
          <span className="text-xs text-slate-500">
            {sales.length} invoice(s) · {money(totals.total, currency)} total ·{' '}
            <span className="font-semibold text-amber-600">{money(totals.outstanding, currency)} outstanding</span>
          </span>
        </div>
      </form>

      {sales.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description="Record a sale to generate your first invoice."
        />
      ) : (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Invoice</th>
              <th className="th">Date</th>
              <th className="th">Customer</th>
              <th className="th">Items</th>
              <th className="th text-right">Total</th>
              <th className="th text-right">Balance</th>
              <th className="th">Status</th>
              <th className="th">Delivery</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {sales.map((s) => {
              const balance = num(s.total) - num(s.amountPaid);
              return (
                <tr key={s.id} className="transition hover:bg-slate-50">
                  <td className="td font-medium">
                    <Link href={`/invoices/${s.id}`} className="text-brand-600 hover:text-brand-700">
                      {s.invoiceNumber}
                    </Link>
                  </td>
                  <td className="td">{fmtDate(s.soldAt)}</td>
                  <td className="td">{s.customer?.name ?? 'Walk-in customer'}</td>
                  <td className="td">{s._count.items}</td>
                  <td className="td text-right font-semibold">{money(num(s.total), currency)}</td>
                  <td className="td text-right">
                    {balance > 0.001 ? (
                      <Badge tone="amber">{money(balance, currency)}</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="td">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="td">
                    <Badge tone={s.deliveredAt ? 'green' : 'slate'}>
                      {s.deliveredAt ? 'delivered' : 'pending'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
