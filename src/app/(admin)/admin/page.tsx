import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, Building2, KeyRound, LogIn, Users } from 'lucide-react';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays, dayKey, fmtDateTime, num, startOfDay } from '@/lib/format';
import { Card, PageHeader, StatCard } from '@/components/ui';
import { LoginBarChart } from '@/components/charts';

export const metadata: Metadata = { title: 'Admin overview' };

export default async function AdminOverviewPage() {
  await requireAdminSession();

  const now = new Date();
  const startToday = startOfDay(now);
  const start7d = startOfDay(addDays(now, -6));
  const start30d = startOfDay(addDays(now, -29));
  const start14d = startOfDay(addDays(now, -13));

  const [
    brandCount,
    activeBrandCount,
    userCount,
    activeUserCount,
    loginsToday,
    logins7d,
    sales30,
    loginEvents,
    recentLogs,
    topBrandsRaw,
  ] = await Promise.all([
    prisma.brand.count(),
    prisma.brand.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.usageLog.count({ where: { action: 'LOGIN', createdAt: { gte: startToday } } }),
    prisma.usageLog.count({ where: { action: 'LOGIN', createdAt: { gte: start7d } } }),
    prisma.sale.findMany({
      where: { soldAt: { gte: start30d } },
      select: { total: true, brandId: true, brand: { select: { name: true } } },
    }),
    prisma.usageLog.findMany({
      where: { action: 'LOGIN', createdAt: { gte: start14d } },
      select: { createdAt: true },
    }),
    prisma.usageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: {
        user: { select: { name: true } },
        brand: { select: { name: true } },
      },
    }),
    prisma.brand.findMany({
      select: { id: true, name: true, isActive: true },
    }),
  ]);

  const totalRevenue30 = sales30.reduce((sum, s) => sum + num(s.total), 0);
  const revenueByBrand = new Map<string, { name: string; revenue: number; orders: number }>();
  for (const s of sales30) {
    const cur = revenueByBrand.get(s.brandId) ?? { name: s.brand.name, revenue: 0, orders: 0 };
    cur.revenue += num(s.total);
    cur.orders += 1;
    revenueByBrand.set(s.brandId, cur);
  }
  const topBrands = [...revenueByBrand.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Logins/day for the last 14 days
  const loginCounts = new Map<string, number>();
  for (const e of loginEvents) {
    const key = dayKey(e.createdAt);
    loginCounts.set(key, (loginCounts.get(key) ?? 0) + 1);
  }
  const chartData = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(start14d, i);
    return {
      label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      logins: loginCounts.get(dayKey(d)) ?? 0,
    };
  });

  const activeBrandsMap = new Set(topBrandsRaw.filter((b) => b.isActive).map((b) => b.id));

  return (
    <div>
      <PageHeader title="Platform overview" description="Everything happening across your brands." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Brands"
          value={String(brandCount)}
          sub={`${activeBrandCount} active · ${brandCount - activeBrandCount} deactivated`}
          icon={Building2}
        />
        <StatCard
          label="Users"
          value={String(userCount)}
          sub={`${activeUserCount} active`}
          icon={Users}
        />
        <StatCard
          label="Logins today"
          value={String(loginsToday)}
          sub={`${logins7d} in the last 7 days`}
          icon={LogIn}
        />
        <StatCard
          label="Platform revenue (30d)"
          value={totalRevenue30.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          sub={`${sales30.length} orders across all brands`}
          icon={Activity}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <h2 className="mb-3 font-semibold text-slate-900">Login activity — last 14 days</h2>
          <LoginBarChart data={chartData} />
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Top brands (30d revenue)</h2>
            <Link href="/admin/brands" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              All brands →
            </Link>
          </div>
          {topBrands.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No sales in the last 30 days.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {topBrands.map((b, i) => (
                <li key={b.id} className="flex items-center justify-between py-2.5">
                  <Link href={`/admin/brands/${b.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
                    <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                    <span className="truncate text-sm font-medium text-slate-800">{b.name}</span>
                    {!activeBrandsMap.has(b.id) ? (
                      <span className="text-[10px] uppercase text-red-500">inactive</span>
                    ) : null}
                  </Link>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">
                      {b.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[11px] text-slate-400">{b.orders} orders</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Activity className="h-4 w-4" /> Recent activity
          </h2>
          <Link href="/admin/logs" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            Full activity log →
          </Link>
        </div>
        <Card className="divide-y divide-slate-100">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 px-5 py-3">
              <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                <KeyRound className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-800">
                  <strong>{log.user?.name ?? 'Unknown user'}</strong>{' '}
                  <span className="text-slate-500">
                    {log.action === 'LOGIN' ? 'logged in' : log.action === 'LOGOUT' ? 'signed out' : log.action}
                  </span>
                  {log.brand ? <span className="text-slate-400"> · {log.brand.name}</span> : null}
                </p>
                {log.detail ? <p className="truncate text-xs text-slate-400">{log.detail}</p> : null}
              </div>
              <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(log.createdAt)}</span>
            </div>
          ))}
          {recentLogs.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">No activity recorded yet.</p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
