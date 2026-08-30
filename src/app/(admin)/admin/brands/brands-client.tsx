'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Search } from 'lucide-react';
import { api } from '@/lib/client';
import { Badge, Button, Card, EmptyState, PageHeader, TableWrap } from '@/components/ui';
import { Modal } from '@/components/modal';
import { fmtDate } from '@/lib/format';
import type { AdminBrandRow } from './page';

export function BrandsClient({ brands }: { brands: AdminBrandRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', currency: 'NGN' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q));
  }, [brands, search]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/admin/brands', { method: 'POST', body: JSON.stringify(form) });
      setCreateOpen(false);
      setForm({ name: '', description: '', currency: 'NGN' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Brands" description="Every brand workspace on the platform.">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add brand
        </Button>
      </PageHeader>

      <div className="mb-4 sm:w-72">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search brand name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={brands.length === 0 ? 'No brands yet' : 'No matches'}
          description={
            brands.length === 0 ? 'Brands appear here when they sign up, or when you create one.' : undefined
          }
        />
      ) : (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Brand</th>
              <th className="th">Currency</th>
              <th className="th text-right">Users</th>
              <th className="th text-right">Products</th>
              <th className="th text-right">Invoices</th>
              <th className="th">Joined</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.map((b) => (
              <tr key={b.id} className={`transition hover:bg-slate-50 ${b.isActive ? '' : 'opacity-60'}`}>
                <td className="td">
                  <Link
                    href={`/admin/brands/${b.id}`}
                    className="font-medium text-brand-600 hover:text-brand-700"
                  >
                    {b.name}
                  </Link>
                  <div className="font-mono text-xs text-slate-400">{b.slug}</div>
                </td>
                <td className="td">{b.currency}</td>
                <td className="td text-right">{b.users}</td>
                <td className="td text-right">{b.products}</td>
                <td className="td text-right">{b.sales}</td>
                <td className="td text-slate-500">{fmtDate(b.createdAt)}</td>
                <td className="td">
                  <Badge tone={b.isActive ? 'green' : 'red'}>{b.isActive ? 'active' : 'inactive'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Card className="mt-4 p-4">
        <p className="text-xs text-slate-400">
          Opening a brand takes you to its details: edit settings, manage its staff, view recent
          activity, and (in the danger zone) deactivate or delete it.
        </p>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add a brand">
        <form onSubmit={create} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
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
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create brand'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
