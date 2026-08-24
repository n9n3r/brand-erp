import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  Package,
  ShieldCheck,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { Logo, LogoMark } from '@/components/logo';

const features = [
  {
    icon: ShoppingCart,
    title: 'Sales & invoicing',
    text: 'Ring up sales in seconds, auto-generate numbered invoices, track part-payments and print or share them.',
  },
  {
    icon: Package,
    title: 'Inventory control',
    text: 'Products, stock levels and reorder alerts. Categories are fully manual — organise your catalogue your way.',
  },
  {
    icon: Users,
    title: 'Customer directory',
    text: 'Every buyer in one place with their order history and lifetime spend, ready for the next follow-up.',
  },
  {
    icon: BarChart3,
    title: 'Reports that matter',
    text: 'Revenue, top products and payment status over any date range — exportable to CSV for your accountant.',
  },
  {
    icon: ShieldCheck,
    title: 'Multi-brand, one platform',
    text: 'A super admin oversees every brand: edit details, manage users and monitor logins & usage frequency.',
  },
  {
    icon: FileText,
    title: 'Built to grow',
    text: 'Runs on serverless free tiers today; scales to a dedicated database and team plans when you do.',
  },
];

const steps = [
  { n: '01', title: 'Create your brand', text: 'Sign up with your brand name — your workspace is ready instantly.' },
  { n: '02', title: 'Add products & customers', text: 'Set your own categories, load your catalogue and save your buyers.' },
  { n: '03', title: 'Sell and watch it grow', text: 'Record sales, issue invoices and read the numbers on your dashboard.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} />
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(800px circle at 20% -10%, rgba(99,102,241,0.18), transparent 55%), radial-gradient(600px circle at 90% 10%, rgba(79,70,229,0.12), transparent 50%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
            Simple ERP for small brands
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Run your whole brand from <span className="text-brand-600">one dashboard</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Sales, inventory, customers, invoices and reports — the operational backbone your
            growing business needs, without the enterprise complexity.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 sm:w-auto"
            >
              Create your free account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              Log in
            </Link>
          </div>
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-4 text-center">
            {[
              ['10–100', 'users per platform'],
              ['100%', 'free tier friendly'],
              ['2 min', 'to first invoice'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xl font-bold text-slate-900 sm:text-2xl">{v}</div>
                <div className="mt-1 text-xs text-slate-500">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight">Everything a small brand needs</h2>
            <p className="mt-3 text-slate-600">
              Purpose-built modules that work together — no bloat, no six-month implementation.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Up and running in three steps</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-slate-200 p-6">
                <span className="text-sm font-bold text-brand-600">{s.n}</span>
                <h3 className="mt-2 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl bg-slate-900 px-6 py-14 text-center sm:px-12">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Ready to see your numbers clearly?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Join your brand today. Your first invoice is minutes away.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {['Free while you test', 'No credit card required', 'Your data, always exportable'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-sm text-slate-300">
                  <Check className="h-4 w-4 text-emerald-400" /> {t}
                </span>
              ))}
            </div>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Get started now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <LogoMark size={20} /> © {new Date().getFullYear()} MyBrand. Built for small brands.
          </span>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-slate-800">Log in</Link>
            <Link href="/signup" className="hover:text-slate-800">Sign up</Link>
            <Link href="/forgot-password" className="hover:text-slate-800">Reset password</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
