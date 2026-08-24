import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays, fmtDate, fmtDateTime, startOfDay } from '@/lib/format';
import { Badge, Card } from '@/components/ui';
import { BrandEditForm } from './brand-edit-form';

export const metadata: Metadata = { title: 'Brand details' };

export default async function AdminBrandDetailPage({ params }: { params: { id: string } }) {
  await requireAdminSession();

  const brand = await prisma.brand.findUnique({
    where: { id: params.id },
    include: {
      users: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, loginCount: true },
      },
      _count: { select: { products: true, customers: true, sales: true, categories: true } },
    },
  });
  if (!brand) notFound();

  const start30d = startOfDay(addDays(new Date(), -29));
  const [agg] = await Promise.all([
    prisma.sale.aggregate({
      where: { brandId: brand.id, soldAt: { gte: start30d } },
      _sum: { total: true },
      _count: true,
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
        <div className="lg:col-span-2">
          <BrandEditForm
            brandId={brand.id}
            initial={{
              name: brand.name,
              description: brand.description ?? '',
              currency: brand.currency,
              isActive: brand.isActive,
            }}
          />

          <h2 className="mb-3 mt-8 font-semibold text-slate-900">Team & usage</h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">User</th>
                    <th className="th">Role</th>
                    <th className="th text-right">Logins</th>
                    <th className="th">Last login</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {brand.users.map((u) => (
                    <tr key={u.id}>
                      <td className="td">
                        <div className="font-medium text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="td">
                        <Badge tone={u.role === 'BRAND_ADMIN' ? 'indigo' : 'slate'}>
                          {u.role === 'BRAND_ADMIN' ? 'admin' : 'staff'}
                        </Badge>
                      </td>
                      <td className="td text-right">{u.loginCount}</td>
                      <td className="td text-slate-500">
                        {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'never'}
                      </td>
                      <td className="td">
                        <Badge tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'active' : 'disabled'}</Badge>
                      </td>
                    </tr>
                  ))}
                  {brand.users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="td py-8 text-center text-slate-500">
                        No users yet — add one from the{' '}
                        <Link href="/admin/users" className="text-brand-600 hover:underline">
                          Users page
                        </Link>
                        .
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
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
