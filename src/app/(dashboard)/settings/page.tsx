import type { Metadata } from 'next';
import { requireBrandSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fmtDate } from '@/lib/format';
import { Card, PageHeader, Badge } from '@/components/ui';
import { SettingsForm } from './settings-form';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const session = await requireBrandSession();
  const brand = await prisma.brand.findUnique({
    where: { id: session.brandId },
    select: { name: true, slug: true, description: true, currency: true, createdAt: true },
  });
  if (!brand) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Brand settings" description="Details shown on your invoices and used across your workspace." />
      <SettingsForm
        initial={{ name: brand.name, description: brand.description ?? '', currency: brand.currency }}
      />
      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Workspace info</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Workspace ID (slug)</dt>
            <dd className="font-mono text-slate-800">{brand.slug}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Created</dt>
            <dd className="text-slate-800">{fmtDate(brand.createdAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Your role</dt>
            <dd>
              <Badge tone="indigo">{session.role === 'BRAND_ADMIN' ? 'Brand admin' : 'Staff'}</Badge>
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-400">
          Need to rename or deactivate the brand, or manage staff accounts? Contact the platform super admin.
        </p>
      </Card>
    </div>
  );
}
