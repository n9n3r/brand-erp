'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { Button } from '@/components/ui';

export function LoginForm({ next, initialInfo }: { next?: string; initialInfo?: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ role: string; brandName: string | null }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      // Honour the "next" hint (from the middleware) unless it points into the
      // wrong area for this role — the middleware re-checks on the next hop.
      const isSuperAdmin = data.role === 'SUPER_ADMIN';
      const destination =
        next && next.startsWith('/') && !next.startsWith('/admin')
          ? next
          : isSuperAdmin
            ? '/admin'
            : '/dashboard';
      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {initialInfo ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {initialInfo}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div>
        <label className="label">Email</label>
        <input
          className="input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@brand.com"
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label mb-0">Password</label>
          <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">
            Forgot password?
          </Link>
        </div>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="pt-1 text-center text-sm text-slate-500">
        New brand?{' '}
        <Link href="/signup" className="font-medium text-brand-600 hover:text-brand-700">
          Create your workspace
        </Link>
      </p>
    </form>
  );
}
