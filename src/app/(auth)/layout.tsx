import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96"
        style={{
          background:
            'radial-gradient(700px circle at 50% -20%, rgba(99,102,241,0.16), transparent 60%)',
        }}
      />
      <header className="relative z-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} />
          </Link>
        </div>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">{children}</main>
    </div>
  );
}
