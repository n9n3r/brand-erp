'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Plus, Power } from 'lucide-react';
import { api, CURRENCIES } from '@/lib/client';
import { Badge, Button, PageHeader, TableWrap } from '@/components/ui';
import { Modal } from '@/components/modal';

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  description: string | null;
  isActive: boolean;
  users: number;
  products: number;
  customers: number;
  createdAt: string;
  revenue30: number;
  orders30: number;
};

export function BrandsClient({ brands }: { brands: BrandRow[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', currency: 'NGN' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createBrand(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/admin/brands', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description.trim() || null,
          currency: form.currency,
        }),
      });
      setCreateOpen(false);
      setForm({ name: '', description: '', currency: 'NGN' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(brand: BrandRow) {
    const verb = brand.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`${verb === 'deactivate' ? 'Deactivate' : 'Activate'} "${brand.name}"?${verb === 'deactivate' ? ' All its users will be locked out.' : ''}`)) return;
    try {
      await api(`/api/admin/brands/${brand.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !brand.isActive }),
      });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Update failed');
    }
  }

  return (
    <div>
      <PageHeader title="Brands" description="Every brand on the platform.">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New brand
        </Button>
      </PageHeader>

      <TableWrap>
        <thead className="bg-slate-50">
          <tr>
            <th className="th">Brand</th>
            <th className="th">Status</th>
            <th className="th text-right">Users</th>
            <th className="th text-right">Products</th>
            <th className="th text-right">Orders (30d)</th>
            <th className="th text-right">Revenue (30d)</th>
            <th className="th">Joined</th>
            <th className="th" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {brands.map((b) => (
            <tr key={b.id} className={`transition hover:bg-slate-50 ${b.isActive ? '' : 'opacity-60'}`}>
              <td className="td">
                <Link href={`/admin/brands/${b.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                  {b.name}
                </Link>
                <div className="font-mono text-[11px] text-slate-400">{b.slug}</div>
              </td>
              <td className="td">
                <Badge tone={b.isActive ? 'green' : 'red'}>{b.isActive ? 'active' : 'inactive'}</Badge>
              </td>
              <td className="td text-right">{b.users}</td>
              <td className="td text-right">{b.products}</td>
              <td className="td text-right">{b.orders30}</td>
              <td className="td text-right font-semibold">
                {b.revenue30.toLocaleString(undefined, { maximumFractionDigits: 0 })} {b.currency}
              </td>
              <td className="td text-slate-500">{b.createdAt}</td>
              <td className="td">
                <div className="flex justify-end gap-1">
                  <Link href={`/admin/brands/${b.id}`}>
                    <Button variant="ghost" size="sm" aria-label={`Edit ${b.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(b)}
                    className={b.isActive ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}
                    aria-label={`Toggle ${b.name}`}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {brands.length === 0 ? (
            <tr>
              <td colSpan={8} className="td py-10 text-center text-slate-500">
                No brands yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </TableWrap>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a brand">
        <form onSubmit={createBrand} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          <div>
            <label className="label">Brand name *</label>
            <input
              className="input"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
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
          <p className="text-xs text-slate-400">
            After creating a brand, add its first user from the Users page.
          </p>
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
