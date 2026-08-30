'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { api } from '@/lib/client';
import { Button } from '@/components/ui';
import { PASSWORD_RULES, validatePassword } from '@/lib/password-policy';

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = useMemo(() => validatePassword(password), [password]);
  const mismatch = confirm.length > 0 && password !== confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      router.push('/login');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
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
        <label className="label">New password *</label>
        <input
          className="input"
          type="password"
          required
          minLength={10}
          maxLength={72}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 10 characters"
        />
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {PASSWORD_RULES.map((rule) => {
            const passed = validation.rules[rule.id];
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
        </ul>
      </div>
      <div>
        <label className="label">Confirm new password *</label>
        <input
          className="input"
          type="password"
          required
          minLength={10}
          maxLength={72}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {mismatch ? <p className="mt-1 text-xs text-red-600">Passwords do not match</p> : null}
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={busy || !validation.ok || password !== confirm || password.length === 0}
      >
        {busy ? 'Saving…' : 'Save new password'}
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
