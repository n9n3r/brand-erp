'use client';

import { useState } from 'react';
import { MailCheck, Send } from 'lucide-react';
import { api } from '@/lib/client';
import { Button } from '@/components/ui';

/** Persistent amber banner for logged-in users whose email isn't verified yet. */
export function VerifyEmailBanner({ verified }: { verified: boolean }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (verified) return null;

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ message: string; devLink?: string }>('/api/auth/verify-email', {
        method: 'POST',
      });
      setSent(true);
      setDevLink(res.devLink ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send email');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Please verify your email address</p>
            {sent ? (
              <p className="mt-0.5 text-xs text-amber-700">
                Verification email sent — check your inbox (and spam folder). The link is valid for 24 hours.
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-amber-700">
                We sent you a confirmation link when you signed up. Didn&apos;t get it?
              </p>
            )}
            {devLink ? (
              <a href={devLink} className="mt-1 block break-all text-xs font-semibold text-brand-600 hover:underline">
                Dev link (email provider not configured): {devLink}
              </a>
            ) : null}
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={resend} disabled={busy} className="shrink-0">
          <Send className="h-3.5 w-3.5" /> {busy ? 'Sending…' : sent ? 'Resend' : 'Resend email'}
        </Button>
      </div>
    </div>
  );
}
