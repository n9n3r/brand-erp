import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BarChart3,
  FileText,
  Package,
  ShieldCheck,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react';
import { Logo, LogoMark } from '@/components/logo';

export const metadata: Metadata = {
  title: 'MyBrand — ERP for small brands',
  description:
    'Sales, inventory, customers, invoicing and reports for small brands — plus a super-admin console for the platform.',
};

const FEATURES = [
  {
    icon: ShoppingCart,
    title: 'POS-style sales',
    text: 'Record sales with live stock checks, discounts and tax — every sale becomes an auto-numbered invoice.',
  },
  {
    icon: Package,
    title: 'Inventory with your categories',
    text: 'Products with SKUs, cost and price, reorder alerts, and categories created manually by your brand.',
  },
  {
    icon: Users,
    title: 'Customer directory',
    text: 'Keep contacts with order counts and lifetime spend, attached to every invoice.',
  },
  {
    icon: FileText,
    title: 'Invoicing & part-payments',
    text: 'Paid, partial and unpaid statuses, part-payments recorded later, and a printable invoice page.',
  },
  {
    icon: Wallet,
    title: 'Expenses',
    text: 'Track stock purchases, rent, transport and ads — see them against revenue in reports.',
  },
  {
    icon: BarChart3,
    title: 'Reports & CSV export',
    text: 'Revenue over time, top products, outstanding balance and payment-status breakdowns for any date range.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo size={30} />
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 text-center sm:px-6">
        <div className="mx-auto mb-6 flex justify-center">
          <LogoMark size={72} className="rounded-3xl shadow-lg shadow-brand-500/20" />
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          The simple ERP for <span className="text-brand-600">small brands</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
          Sales, inventory, customers, invoicing and reports in one workspace — plus a
          super-admin console that monitors every brand&apos;s logins and usage.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Create your workspace
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
            Everything a small brand needs
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <f.icon className="h-6 w-6 text-brand-600" />
                <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-slate-400">
            <ShieldCheck className="h-4 w-4" />
            Multi-tenant by design — one brand can never see another brand&apos;s data.
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        MyBrand · sales, inventory and invoicing for small brands
      </footer>
    </div>
  );
}
