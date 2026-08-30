'use client';

import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { api } from '@/lib/client';
import { Button } from '@/components/ui';

/** Amber banner for users who signed up but have not verified their email yet. */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/verify-email', { method: 'POST' });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resend failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print mb-6 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <MailWarning className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          Verify your email <strong>{email}</strong> to secure your account.
          {sent ? ' A new verification link has been sent.' : ''}
          {error ? ` ${error}` : ''}
        </span>
      </div>
      <Button size="sm" variant="secondary" className="shrink-0" onClick={resend} disabled={busy}>
        {busy ? 'Sending…' : 'Resend link'}
      </Button>
    </div>
  );
}
