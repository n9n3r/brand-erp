import Link from 'next/link';
import { LogoMark } from '@/components/logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <LogoMark size={56} className="rounded-2xl" />
      <p className="mt-6 text-sm font-semibold tracking-wide text-brand-600 uppercase">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
      >
        Back to home
      </Link>
    </div>
  );
}
