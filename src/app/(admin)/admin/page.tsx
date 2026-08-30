import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, Building2, LogIn as Login, UserPlus, Users } from 'lucide-react';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays, dayKey, fmtDateTime, money, num, startOfDay } from '@/lib/format';
import { Card, PageHeader, StatCard, Badge } from '@/components/ui';
import { LoginBarChart } from '@/components/charts';

export const metadata: Metadata = { title: 'Overview' };

export default async function AdminOverviewPage() {
  await requireAdminSession();
  const now = new Date();
  const today = startOfDay(now);
  const last7 = startOfDay(addDays(now, -6));
  const last14 = startOfDay(addDays(now, -13));
  const last30 = startOfDay(addDays(now, -29));

  const [brandCount, userCount, loginsTodayAgg, logins7dAgg, dailyLogins, topBrands, activity] =
    await Promise.all([
      prisma.brand.count(),
      prisma.user.count(),
      prisma.usageLog.count({ where: { action: 'LOGIN', createdAt: { gte: today } } }),
      prisma.usageLog.count({ where: { action: 'LOGIN', createdAt: { gte: last7 } } }),
      prisma.usageLog.groupBy({
        by: ['createdAt'],
        where: { action: 'LOGIN', createdAt: { gte: last14 } },
        _count: { _all: true },
      }),
      prisma.sale.groupBy({
        by: ['brandId'],
        where: { soldAt: { gte: last30 } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.usageLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { user: { select: { name: true } }, brand: { select: { name: true } } },
      }),
    ]);

  // Bucket the grouped login rows into 14 consecutive days (zero-filled).
  const countsByDay = new Map<string, number>();
  for (const row of dailyLogins) {
    const k = dayKey(row.createdAt);
    countsByDay.set(k, (countsByDay.get(k) ?? 0) + row._count._all);
  }
  const chart = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(now, i - 13);
    const k = dayKey(d);
    return { date: k, logins: countsByDay.get(k) ?? 0 };
  });

  const topBrandIds = topBrands.slice(0, 5).map((t) => t.brandId);
  const topBrandNames = new Map(
    (await prisma.brand.findMany({ where: { id: { in: topBrandIds } }, select: { id: true, name: true, currency: true } })).map(
      (b) => [b.id, b],
    ),
  );

  return (
    <div>
      <PageHeader title="Platform overview" description="Brands, users and login activity across MyBrand." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Brands" value={String(brandCount)} icon={Building2} />
        <StatCard label="Users" value={String(userCount)} icon={Users} />
        <StatCard label="Logins today" value={String(loginsTodayAgg)} icon={Login} />
        <StatCard label="Logins (7d)" value={String(logins7dAgg)} icon={UserPlus} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <h2 className="mb-3 font-semibold text-slate-900">Logins per day (14d)</h2>
          <LoginBarChart data={chart} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Top brands by revenue (30d)</h2>
          {topBrands.length === 0 ? (
            <p className="text-sm text-slate-500">No sales recorded in the last 30 days.</p>
          ) : (
            <ul className="space-y-3">
              {topBrands.slice(0, 5).map((t, i) => {
                const brand = topBrandNames.get(t.brandId);
                return (
                  <li key={t.brandId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-xs text-slate-400">{i + 1}.</span>
                      {brand ? (
                        <Link href={`/admin/brands/${brand.id}`} className="truncate font-medium text-slate-800 hover:text-brand-700">
                          {brand.name}
                        </Link>
                      ) : (
                        <span className="truncate text-slate-400">(deleted brand)</span>
                      )}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-900">
                      {money(num(t._sum.total), brand?.currency ?? 'NGN')}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Activity className="h-4 w-4 text-brand-600" /> Live activity
          </h2>
          <Link href="/admin/logs" className="text-xs font-medium text-brand-600 hover:text-brand-700">
            Full activity log →
          </Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {activity.map((log) => (
            <li key={log.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-800">
                  <strong>{log.user?.name ?? 'System'}</strong>{' '}
                  <Badge tone="indigo" className="mr-1">
                    {log.action}
                  </Badge>
                  <span className="text-slate-500">{log.brand?.name ?? 'platform'}</span>
                </p>
                {log.detail ? <p className="mt-0.5 truncate text-xs text-slate-400">{log.detail}</p> : null}
              </div>
              <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(log.createdAt)}</span>
            </li>
          ))}
          {activity.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-slate-500">No activity recorded yet.</li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
