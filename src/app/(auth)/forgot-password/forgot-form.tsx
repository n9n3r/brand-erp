'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/client';
import { Button } from '@/components/ui';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ message: string; devLink?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
      setDevLink(res.devLink ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Check your inbox</h1>
        <p className="mt-2 text-sm text-slate-500">
          If an account exists for <strong>{email}</strong>, a password reset link is on its way. The
          link expires in 1 hour.
        </p>
        {devLink ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Email provider not configured — dev link
            </p>
            <a href={devLink} className="mt-1 block break-all text-sm font-medium text-brand-600 hover:underline">
              {devLink}
            </a>
          </div>
        ) : null}
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
          ← Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Forgot your password?</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your account email and we&apos;ll send you a reset link.
        </p>
        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="input"
              placeholder="you@brand.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Back to login
        </Link>
      </p>
    </div>
  );
}
