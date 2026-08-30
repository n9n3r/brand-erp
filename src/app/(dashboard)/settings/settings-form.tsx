'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { Button, Card } from '@/components/ui';

export function SettingsForm({
  initial,
}: {
  initial: { name: string; description: string; currency: string };
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
      await api('/api/brand', { method: 'PATCH', body: JSON.stringify(form) });
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
      <p className="mt-1 text-xs text-slate-500">Shown at the top of your invoices and across the workspace.</p>
      <form onSubmit={save} className="mt-4 space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        {saved ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Brand settings saved.
          </div>
        ) : null}
        <div>
          <label className="label">Brand name *</label>
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
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={2}
            maxLength={300}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g. Handmade skincare from Lagos"
          />
        </div>
        <div className="sm:w-40">
          <label className="label">Currency *</label>
          <input
            className="input uppercase"
            required
            minLength={3}
            maxLength={8}
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            placeholder="NGN"
          />
        </div>
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
