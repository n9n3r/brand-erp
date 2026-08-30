import type { Metadata } from 'next';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fmtDateTime } from '@/lib/format';
import { USAGE_ACTIONS, type UsageAction } from '@/lib/logs';
import { Badge, Card, EmptyState, PageHeader, TableWrap } from '@/components/ui';
import { ScrollText } from 'lucide-react';

export const metadata: Metadata = { title: 'Activity logs' };

const PAGE_SIZE = 50;

type SearchParams = {
  action?: string;
  brandId?: string;
  from?: string;
  to?: string;
  page?: string;
};

export default async function AdminLogsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminSession();

  const action = USAGE_ACTIONS.includes(searchParams.action as UsageAction)
    ? (searchParams.action as UsageAction)
    : null;
  const brandId = searchParams.brandId || null;
  const from = searchParams.from ? new Date(`${searchParams.from}T00:00:00`) : null;
  const to = searchParams.to ? new Date(`${searchParams.to}T23:59:59.999`) : null;
  if (from && Number.isNaN(from.getTime())) throw new Error('Invalid from date');
  if (to && Number.isNaN(to.getTime())) throw new Error('Invalid to date');

  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);

  const where = {
    ...(action ? { action } : {}),
    ...(brandId ? { brandId } : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };

  const [brands, total, logs] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.usageLog.count({ where }),
    prisma.usageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true } }, brand: { select: { name: true } } },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Activity logs" description="Every login and business action, across all brands." />

      <form action="/admin/logs" method="GET" className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label">Action</label>
          <select name="action" className="input" defaultValue={action ?? ''}>
            <option value="">All actions</option>
            {USAGE_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a.replaceAll('_', ' ').toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Brand</label>
          <select name="brandId" className="input" defaultValue={brandId ?? ''}>
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" name="from" className="input" defaultValue={searchParams.from ?? ''} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" name="to" className="input" defaultValue={searchParams.to ?? ''} />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Filter
          </button>
          <a
            href="/admin/logs"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Reset
          </a>
        </div>
      </form>

      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No activity matches" description="Try widening the date range or clearing the filters." />
      ) : (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr>
              <th className="th">When</th>
              <th className="th">User</th>
              <th className="th">Brand</th>
              <th className="th">Action</th>
              <th className="th">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {logs.map((log) => (
              <tr key={log.id} className="transition hover:bg-slate-50">
                <td className="td whitespace-nowrap text-slate-500">{fmtDateTime(log.createdAt)}</td>
                <td className="td">{log.user?.name ?? '—'}</td>
                <td className="td text-slate-500">{log.brand?.name ?? 'platform'}</td>
                <td className="td">
                  <Badge tone="indigo">{log.action}</Badge>
                </td>
                <td className="td max-w-md truncate text-slate-500">{log.detail ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {pages} · {total} entries
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <a
                href={`/admin/logs?page=${page - 1}${action ? `&action=${action}` : ''}${brandId ? `&brandId=${brandId}` : ''}${searchParams.from ? `&from=${searchParams.from}` : ''}${searchParams.to ? `&to=${searchParams.to}` : ''}`}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                ← Newer
              </a>
            ) : null}
            {page < pages ? (
              <a
                href={`/admin/logs?page=${page + 1}${action ? `&action=${action}` : ''}${brandId ? `&brandId=${brandId}` : ''}${searchParams.from ? `&from=${searchParams.from}` : ''}${searchParams.to ? `&to=${searchParams.to}` : ''}`}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Older →
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <Card className="mt-4 p-3 text-center text-xs text-slate-400">{total} entr{total === 1 ? 'y' : 'ies'} total</Card>
      )}
    </div>
  );
}
