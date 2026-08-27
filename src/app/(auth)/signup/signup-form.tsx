'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { api } from '@/lib/client';
import { Button } from '@/components/ui';
import {
  PASSWORD_RULES,
  containsPersonalInfo,
  validatePassword,
} from '@/lib/password-policy';

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', brandName: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = useMemo(() => {
    const v = validatePassword(form.password);
    const ruleMap: Record<string, boolean> = {
      length: v.rules.length,
      letter: v.rules.letter,
      number: v.rules.number,
      common: v.rules.common,
    };
    return { ok: v.ok, rules: ruleMap, personal: containsPersonalInfo(form.password, form) };
  }, [form.password, form.email, form.name]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/signup', { method: 'POST', body: JSON.stringify(form) });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div>
        <label className="label">Your name *</label>
        <input
          className="input"
          required
          minLength={2}
          maxLength={80}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Amaka Okonkwo"
        />
      </div>
      <div>
        <label className="label">Brand name *</label>
        <input
          className="input"
          required
          minLength={2}
          maxLength={80}
          value={form.brandName}
          onChange={(e) => setForm({ ...form, brandName: e.target.value })}
          placeholder="e.g. Amaka Skincare"
        />
      </div>
      <div>
        <label className="label">Email *</label>
        <input
          className="input"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@brand.com"
        />
      </div>
      <div>
        <label className="label">Password *</label>
        <input
          className="input"
          type="password"
          required
          minLength={10}
          maxLength={72}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="At least 8 characters"
        />
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {PASSWORD_RULES.map((rule) => {
            const passed = checks.rules[rule.id];
            return (
              <li
                key={rule.id}
                className={`flex items-center gap-1.5 text-xs ${passed ? 'text-emerald-600' : 'text-slate-400'}`}
              >
                {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {rule.label}
              </li>
            );
          })}
          {checks.personal ? (
            <li className="col-span-full flex items-center gap-1.5 text-xs text-red-600">
              <X className="h-3 w-3" /> Must not contain your email or name
            </li>
          ) : null}
        </ul>
      </div>
      <Button type="submit" className="w-full" disabled={busy || !checks.ok || checks.personal}>
        {busy ? 'Creating workspace…' : 'Create workspace'}
      </Button>
      <p className="pt-1 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </form>
  );
}
