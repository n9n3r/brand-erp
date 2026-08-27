import Link from 'next/link';
import { Logo } from '@/components/logo';

/** Centered card shell for login / signup / password recovery. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link href="/" className="mb-8" aria-label="MyBrand home">
        <Logo size={34} />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {children}
      </div>
      <p className="mt-6 text-xs text-slate-400">
        MyBrand — sales, inventory and invoicing for small brands
      </p>
    </div>
  );
}
