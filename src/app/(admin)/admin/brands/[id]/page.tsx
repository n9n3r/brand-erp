import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays, fmtDate, fmtDateTime, startOfDay } from '@/lib/format';
import { Badge, Card } from '@/components/ui';
import { BrandEditForm } from './brand-edit-form';
import { UserManager } from './user-manager';
import { DangerZone } from './danger-zone';

export const metadata: Metadata = { title: 'Brand details' };

export default async function AdminBrandDetailPage({ params }: { params: { id: string } }) {
  await requireAdminSession();

  const brand = await prisma.brand.findUnique({
    where: { id: params.id },
    include: {
      users: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          loginCount: true,
        },
      },
      _count: { select: { products: true, customers: true, sales: true, categories: true, users: true, expenses: true } },
    },
  });
  if (!brand) notFound();

  const start30d = startOfDay(addDays(new Date(), -29));
  const [agg, activities] = await Promise.all([
    prisma.sale.aggregate({
      where: { brandId: brand.id, soldAt: { gte: start30d } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.usageLog.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { user: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <Link
        href="/admin/brands"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> All brands
      </Link>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900">
            {brand.name}
            <Badge tone={brand.isActive ? 'green' : 'red'}>{brand.isActive ? 'active' : 'inactive'}</Badge>
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-400">
            {brand.slug} · joined {fmtDate(brand.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <BrandEditForm
            brandId={brand.id}
            initial={{
              name: brand.name,
              description: brand.description ?? '',
              currency: brand.currency,
              isActive: brand.isActive,
            }}
          />

          <UserManager
            brandId={brand.id}
            users={brand.users.map((u) => ({
              ...u,
              emailVerified: !!u.emailVerifiedAt,
              lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
            }))}
          />

          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Recent activity</h2>
            <ul className="divide-y divide-slate-100">
              {activities.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-800">
                      <strong>{log.user?.name ?? 'System'}</strong>{' '}
                      <span className="text-slate-500">
                        {log.action === 'LOGIN' ? 'logged in' : log.action === 'LOGOUT' ? 'signed out' : log.action.replaceAll('_', ' ').toLowerCase()}
                      </span>
                    </p>
                    {log.detail ? <p className="truncate text-xs text-slate-400">{log.detail}</p> : null}
                  </div>
                  <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(log.createdAt)}</span>
                </li>
              ))}
              {activities.length === 0 ? (
                <li className="py-8 text-center text-sm text-slate-500">No activity recorded yet.</li>
              ) : null}
            </ul>
          </Card>

          <DangerZone
            brandId={brand.id}
            brandName={brand.name}
            stats={{
              users: brand._count.users,
              sales: brand._count.sales,
              products: brand._count.products,
              expenses: brand._count.expenses,
            }}
          />
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Catalogue</h2>
            <dl className="space-y-2 text-sm">
              {[
                ['Products', brand._count.products],
                ['Categories', brand._count.categories],
                ['Customers', brand._count.customers],
                ['Invoices (all time)', brand._count.sales],
                ['Expenses', brand._count.expenses],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Last 30 days</h2>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Orders</span>
              <span className="font-semibold text-slate-900">{agg._count}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-slate-500">Revenue</span>
              <span className="font-semibold text-slate-900">
                {agg._sum.total ? Number(agg._sum.total).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}{' '}
                {brand.currency}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
