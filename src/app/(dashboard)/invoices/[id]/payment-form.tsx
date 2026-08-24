'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { api } from '@/lib/client';
import { Button, Card } from '@/components/ui';
import { money } from '@/lib/format';

export function PaymentForm({ saleId, balance, currency }: { saleId: string; balance: number; currency: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(balance.toFixed(2)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/sales/${saleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ amountPaid: Number(amount || 0) }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record payment');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
        <Wallet className="h-4 w-4" /> Record a payment
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        Balance outstanding: <strong>{money(balance, currency)}</strong>. Update the total amount paid so far —
        status is recalculated automatically.
      </p>
      {error ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div>
          <label className="label">Total amount paid (so far)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            className="input sm:w-48"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save payment'}
        </Button>
      </form>
    </Card>
  );
}
