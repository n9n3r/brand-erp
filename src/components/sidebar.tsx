'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Activity as ActivityIcon,
} from 'lucide-react';
import { api } from '@/lib/client';
import { cn } from '@/components/ui';
import { LogoMark } from '@/components/logo';

const brandNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/sales/new', label: 'New Sale', icon: ShoppingCart },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminNav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/brands', label: 'Brands', icon: Building2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/logs', label: 'Activity Logs', icon: ActivityIcon },
];

function NavItems({ items }: { items: typeof brandNav }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
              active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <item.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }
  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white',
        className
      )}
    >
      <LogOut className="h-[18px] w-[18px]" />
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

export function BrandSidebar({ brandName, userName, role }: { brandName: string; userName: string; role: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-900 lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <LogoMark size={32} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{brandName}</div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500">MyBrand workspace</div>
        </div>
      </div>
      <NavItems items={brandNav} />
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-3">
          <div className="truncate text-sm font-medium text-white">{userName}</div>
          <div className="text-[11px] text-slate-500">{role === 'BRAND_ADMIN' ? 'Brand admin' : 'Staff'}</div>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}

export function AdminSidebar({ userName }: { userName: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-900 lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <LogoMark size={32} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">Platform Admin</div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500">MyBrand console</div>
        </div>
      </div>
      <NavItems items={adminNav} />
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-3">
          <div className="truncate text-sm font-medium text-white">{userName}</div>
          <div className="text-[11px] text-slate-500">Super admin</div>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}

export function MobileTopNav({ brandName, area }: { brandName: string; area: 'brand' | 'admin' }) {
  const pathname = usePathname();
  const items = area === 'brand' ? brandNav : adminNav;
  return (
    <div className="no-print sticky top-0 z-30 border-b border-slate-200 bg-slate-900 lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <span className="truncate text-sm font-semibold text-white">{brandName}</span>
        <LogoutButton className="w-auto px-2" />
      </div>
      <div className="flex gap-1 overflow-x-auto px-2 pb-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium',
                active ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
