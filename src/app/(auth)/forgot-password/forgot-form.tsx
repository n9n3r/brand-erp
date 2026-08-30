'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { api } from '@/lib/client';
import { Button } from '@/components/ui';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // The endpoint always succeeds (no account enumeration) — show the same
      // confirmation either way.
      await api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
          If an account exists for <strong>{email}</strong>, a reset link is on its way. It stays
          valid for one hour.
        </div>
        <Link
          href="/login"
          className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div>
        <label className="label">Email</label>
        <input
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@brand.com"
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Sending…' : 'Send reset link'}
      </Button>
      <Link
        href="/login"
        className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        Back to sign in
      </Link>
    </form>
  );
}
