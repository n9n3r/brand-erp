'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { Button } from '@/components/ui';

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Password updated</h1>
        <p className="mt-2 text-sm text-slate-500">Your password has been changed. You can now log in with it.</p>
        <Button className="mt-6 w-full" onClick={() => router.push('/login')}>
          Go to login
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Set a new password</h1>
        <p className="mt-1 text-sm text-slate-500">Choose a strong password of at least 8 characters.</p>
        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Back to login
        </Link>
      </p>
    </div>
  );
}
