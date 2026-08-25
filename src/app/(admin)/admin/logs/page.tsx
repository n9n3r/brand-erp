import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { endOfDay, fmtDateTime, startOfDay } from '@/lib/format';
import { Badge, Button, Card, PageHeader } from '@/components/ui';
import { USAGE_ACTIONS } from '@/lib/logs';

export const metadata: Metadata = { title: 'Activity logs' };

const PAGE_SIZE = 50;

function badgeTone(action: string): 'green' | 'red' | 'amber' | 'slate' | 'indigo' {
  if (action === 'LOGIN' || action === 'LOGOUT') return 'slate';
  if (action === 'SALE_CREATED' || action === 'SALE_PAYMENT') return 'green';
  if (action.startsWith('BRAND_') || action.startsWith('USER_')) return 'indigo';
  if (action === 'PASSWORD_RESET') return 'amber';
  if (action.endsWith('_DELETED')) return 'red';
  return 'slate';
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: { action?: string; brandId?: string; from?: string; to?: string; page?: string };
}) {
  await requireAdminSession();

  const action = USAGE_ACTIONS.includes(searchParams.action as never) ? searchParams.action : undefined;
  const brandId = searchParams.brandId || undefined;
  const from = searchParams.from ? startOfDay(new Date(searchParams.from)) : undefined;
  const to = searchParams.to ? endOfDay(new Date(searchParams.to)) : undefined;
  const page = Math.max(0, Number(searchParams.page ?? 0) || 0);

  const where = {
    ...(action ? { action } : {}),
    ...(brandId ? { brandId } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const [logs, total, brands] = await Promise.all([
    prisma.usageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
      include: {
        user: { select: { name: true, email: true } },
        brand: { select: { name: true } },
      },
    }),
    prisma.usageLog.count({ where }),
    prisma.brand.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);
  const qs = (extra: Record<string, string>) => {
    const params = new URLSearchParams();
    if (action) params.set('action', action);
    if (brandId) params.set('brandId', brandId);
    if (searchParams.from) params.set('from', searchParams.from);
    if (searchParams.to) params.set('to', searchParams.to);
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
    return `/admin/logs?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader title="Activity logs" description="Logins, sales and admin events across the platform." />

      <form action="/admin/logs" method="GET" className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="label">Action</label>
          <select name="action" defaultValue={action ?? ''} className="input sm:w-52">
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
          <select name="brandId" defaultValue={brandId ?? ''} className="input sm:w-48">
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
          <input type="date" name="from" defaultValue={searchParams.from ?? ''} className="input sm:w-40" />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" name="to" defaultValue={searchParams.to ?? ''} className="input sm:w-40" />
        </div>
        <Button type="submit" variant="secondary">Filter</Button>
        <Link href="/admin/logs" className="mb-2 text-xs font-medium text-slate-500 hover:text-slate-800">
          Reset
        </Link>
      </form>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">When</th>
                <th className="th">User</th>
                <th className="th">Brand</th>
                <th className="th">Action</th>
                <th className="th">Detail</th>
                <th className="th">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {logs.map((log) => (
                <tr key={log.id} className="transition hover:bg-slate-50">
                  <td className="td whitespace-nowrap text-slate-500">{fmtDateTime(log.createdAt)}</td>
                  <td className="td">
                    <div className="font-medium text-slate-900">{log.user?.name ?? '—'}</div>
                    <div className="text-xs text-slate-400">{log.user?.email ?? ''}</div>
                  </td>
                  <td className="td">{log.brand?.name ?? <span className="text-slate-400">platform</span>}</td>
                  <td className="td">
                    <Badge tone={badgeTone(log.action)}>{log.action.replaceAll('_', ' ').toLowerCase()}</Badge>
                  </td>
                  <td className="td max-w-xs truncate text-slate-500" title={log.detail ?? ''}>
                    {log.detail ?? '—'}
                  </td>
                  <td className="td font-mono text-xs text-slate-400">{log.ip ?? '—'}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="td py-10 text-center text-slate-500">
                    No log entries match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          {total} entr{total === 1 ? 'y' : 'ies'} · page {page + 1} of {Math.max(1, pages)}
        </span>
        <div className="flex gap-2">
          {page > 0 ? (
            <Link href={qs({ page: String(page - 1) })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50">
              ← Previous
            </Link>
          ) : null}
          {page + 1 < pages ? (
            <Link href={qs({ page: String(page + 1) })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50">
              Next →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
