'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, CURRENCIES } from '@/lib/client';
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api('/api/brand', {
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

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        {saved ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Settings saved.
          </div>
        ) : null}
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
          <label className="label">Description (shown on invoices)</label>
          <textarea
            className="input"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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
          <p className="mt-1 text-xs text-slate-400">Used to format money across the workspace and on invoices.</p>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
