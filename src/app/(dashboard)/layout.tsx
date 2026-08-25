import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireBrandSession } from '@/lib/auth';
import { BrandSidebar, MobileTopNav } from '@/components/sidebar';
import { VerifyEmailBanner } from '@/components/verify-email-banner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireBrandSession();

  // Re-validate against the DB so deactivated users/brands lose access
  // even with an unexpired JWT.
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      isActive: true,
      name: true,
      role: true,
      tokenVersion: true,
      emailVerifiedAt: true,
      brand: { select: { id: true, name: true, isActive: true, currency: true } },
    },
  });
  if (!user || !user.isActive || !user.brand || !user.brand.isActive) {
    redirect('/login?error=disabled');
  }
  // Session versioning: password was reset/changed since this JWT was issued.
  if ((session.tv ?? 0) !== user.tokenVersion) {
    redirect('/login?error=expired');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <BrandSidebar brandName={user.brand.name} userName={user.name} role={user.role} />
      <MobileTopNav brandName={user.brand.name} area="brand" />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <VerifyEmailBanner verified={!!user.emailVerifiedAt} />
          {children}
        </div>
      </main>
    </div>
  );
}
