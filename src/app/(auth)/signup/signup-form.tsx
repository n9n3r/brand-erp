'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { api } from '@/lib/client';
import { Button } from '@/components/ui';
import { validatePassword, containsPersonalInfo } from '@/lib/password-policy';

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', brandName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const checks = useMemo(() => {
    const policy = validatePassword(form.password);
    const personal = containsPersonalInfo(form.password, { email: form.email, name: form.name });
    return [
      { label: '10–72 characters', ok: form.password.length >= 10 && form.password.length <= 72 },
      { label: 'At least one letter and one number', ok: /[A-Za-z]/.test(form.password) && /[0-9]/.test(form.password) },
      { label: 'No common/guessable passwords', ok: form.password.length > 0 && policy.ok },
      { label: 'Not your email or name', ok: form.password.length > 0 && !personal },
    ];
  }, [form]);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/signup', { method: 'POST', body: JSON.stringify(form) });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Create your brand workspace</h1>
        <p className="mt-1 text-sm text-slate-500">
          You&apos;ll be the administrator of your brand. Add staff users later.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input id="name" required className="input" placeholder="Amaka Okonkwo" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="label" htmlFor="brandName">Brand name</label>
            <input id="brandName" required className="input" placeholder="Amaka Skincare" value={form.brandName} onChange={set('brandName')} />
          </div>
          <div>
            <label className="label" htmlFor="email">Work email</label>
            <input id="email" type="email" required autoComplete="email" className="input" placeholder="you@brand.com" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" className="input" placeholder="At least 10 characters" value={form.password} onChange={set('password')} />
            {form.password.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {checks.map((c) => (
                  <li key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {c.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 text-slate-400" />}
                    {c.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Creating workspace…' : 'Create workspace'}
          </Button>
        </form>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
