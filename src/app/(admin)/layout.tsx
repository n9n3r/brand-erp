import { requireAdminSession } from '@/lib/auth';
import { AdminSidebar, MobileTopNav } from '@/components/sidebar';

/** Super-admin console shell. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();

  return (
    <div className="min-h-screen">
      <AdminSidebar userName={session.name} />
      <MobileTopNav brandName="MyBrand Console" area="admin" />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
