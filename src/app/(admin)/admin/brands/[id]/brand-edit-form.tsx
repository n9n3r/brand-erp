'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, CURRENCIES } from '@/lib/client';
import { Button, Card } from '@/components/ui';

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api(`/api/admin/brands/${brandId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name,
          description: form.description.trim() || null,
          currency: form.currency,
        }),
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    const next = !form.isActive;
    if (
      !window.confirm(
        next ? 'Reactivate this brand?' : 'Deactivate this brand? All of its users will be locked out.'
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/brands/${brandId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: next }),
      });
      setForm({ ...form, isActive: next });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold text-slate-900">Brand details</h2>
      <form onSubmit={submit} className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        {saved ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Saved.
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Brand name</label>
            <input
              className="input"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Currency</label>
            <select
              className="input"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant={form.isActive ? 'danger' : 'primary'}
            onClick={toggleActive}
            disabled={busy}
          >
            {form.isActive ? 'Deactivate brand' : 'Reactivate brand'}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save details'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
