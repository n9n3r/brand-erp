'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/client';
import { Button, Card } from '@/components/ui';
import { money, r2 } from '@/lib/format';

/** Record a part-payment or settle the invoice fully (shown while a balance remains). */
export function PaymentForm({
  saleId,
  paid,
  balance,
  currency,
}: {
  saleId: string;
  paid: number;
  balance: number;
  currency: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(balance));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function record(amountToRecord: number) {
    if (!Number.isFinite(amountToRecord) || amountToRecord <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // The API stores the *absolute* amount paid, so send paid + this payment.
      await api(`/api/sales/${saleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ amountPaid: r2(Math.min(paid + amountToRecord, paid + balance)) }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <Banknote className="h-4 w-4" /> Record a payment
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Outstanding balance: <strong>{money(balance, currency)}</strong>
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void record(Number(amount || 0));
        }}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="sm:w-56">
          <label className="label">Amount received *</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0.01"
            max={String(balance)}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? 'Recording…' : 'Record payment'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => void record(balance)}
        >
          <CheckCircle2 className="h-4 w-4" /> Mark fully paid
        </Button>
      </form>
      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </Card>
  );
}
