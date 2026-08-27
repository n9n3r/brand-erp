'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { Button, Card } from '@/components/ui';

/** Super admin edits any brand: name, description, currency, active state. */
export function BrandEditForm({
  brandId,
  initial,
}: {
  brandId: string;
  initial: { name: string; description: string; currency: string; isActive: boolean };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api(`/api/admin/brands/${brandId}`, { method: 'PATCH', body: JSON.stringify(form) });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-slate-900">Brand details</h2>
      <p className="mt-1 text-xs text-slate-500">
        Deactivating a brand locks out all of its users until it is reactivated.
      </p>
      <form onSubmit={save} className="mt-4 space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        {saved ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Brand updated.
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              required
              minLength={2}
              maxLength={80}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Currency *</label>
            <input
              className="input uppercase"
              required
              minLength={3}
              maxLength={8}
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={2}
            maxLength={300}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Brand is active
        </label>
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save brand'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
