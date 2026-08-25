'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { Button, Card } from '@/components/ui';

/** Super admin: permanently delete a brand (type-to-confirm). */
export function DangerZone({
  brandId,
  brandName,
  stats,
}: {
  brandId: string;
  brandName: string;
  stats: { users: number; sales: number; products: number; expenses: number };
}) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteBrand() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/brands/${brandId}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirm: confirmText }),
      });
      router.push('/admin/brands');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setBusy(false);
    }
  }

  return (
    <Card className="border-red-200 p-6">
      <h2 className="flex items-center gap-2 font-semibold text-red-700">
        <AlertTriangle className="h-4 w-4" /> Danger zone — delete brand
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Permanently deletes <strong>{brandName}</strong> and everything under it: {stats.users} user(s),{' '}
        {stats.products} product(s), {stats.sales} invoice(s), {stats.expenses} expense record(s). This cannot be
        undone.
      </p>
      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label">Type “{brandName}” to confirm</label>
          <input
            className="input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={brandName}
            autoComplete="off"
          />
        </div>
        <Button variant="danger" onClick={deleteBrand} disabled={busy || confirmText.trim() !== brandName}>
          <Trash2 className="h-4 w-4" /> {busy ? 'Deleting…' : 'Delete brand forever'}
        </Button>
      </div>
    </Card>
  );
}
