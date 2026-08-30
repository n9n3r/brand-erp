import { requireBrandSession } from '@/lib/auth';
import { BrandSidebar, MobileTopNav } from '@/components/sidebar';
import { VerifyEmailBanner } from '@/components/verify-email-banner';

/** Brand workspace shell: sidebar (desktop) + top nav (mobile) + session guards. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireBrandSession();

  return (
    <div className="min-h-screen">
      <BrandSidebar brandName={session.brandName} userName={session.name} role={session.role} />
      <MobileTopNav brandName={session.brandName} area="brand" />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {!session.emailVerifiedAt ? <VerifyEmailBanner email={session.email} /> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
