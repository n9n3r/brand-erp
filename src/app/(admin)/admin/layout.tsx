import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';
import { AdminSidebar, MobileTopNav } from '@/components/sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isActive: true, name: true, tokenVersion: true },
  });
  if (!user || !user.isActive) redirect('/login?error=disabled');
  if ((session.tv ?? 0) !== user.tokenVersion) redirect('/login?error=expired');

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar userName={user.name} />
      <MobileTopNav brandName="MyBrand Admin" area="admin" />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
