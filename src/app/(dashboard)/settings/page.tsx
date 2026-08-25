import type { Metadata } from 'next';
import { requireBrandSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fmtDate } from '@/lib/format';
import { Card, PageHeader, Badge } from '@/components/ui';
import { SettingsForm } from './settings-form';
import { StaffSection } from './staff-section';
import { LogoSection } from './logo-section';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const session = await requireBrandSession();
  const [brand, staff] = await Promise.all([
    prisma.brand.findUnique({
      where: { id: session.brandId },
      select: { name: true, slug: true, description: true, currency: true, logoUrl: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { brandId: session.brandId, role: { not: 'SUPER_ADMIN' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, loginCount: true },
    }),
  ]);
  if (!brand) return null;

  const staffRows = staff.map((u) => ({
    ...u,
    role: u.role as 'BRAND_ADMIN' | 'BRAND_USER',
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Brand settings" description="Details shown on your invoices and used across your workspace." />
      <SettingsForm
        initial={{ name: brand.name, description: brand.description ?? '', currency: brand.currency }}
      />
      <div className="mt-6">
        <LogoSection logoUrl={brand.logoUrl} />
      </div>
      {session.role === 'BRAND_ADMIN' ? (
        <div className="mt-6">
          <StaffSection staff={staffRows} currentUserId={session.sub} />
        </div>
      ) : (
        <Card className="mt-6 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Team</h2>
          <p className="mt-1 text-xs text-slate-400">
            {staff.length} team member(s). Only brand admins can manage staff — ask an admin for changes.
          </p>
        </Card>
      )}
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
          Renaming or deactivating the brand is done by the platform super admin.
        </p>
      </Card>
    </div>
  );
}
