'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { api } from '@/lib/client';
import { Button, EmptyState, PageHeader, TableWrap } from '@/components/ui';
import { Modal } from '@/components/modal';
import type { CustomerRow } from './page';

const emptyForm = { name: '', email: '', phone: '', address: '' };

export function CustomersClient({ customers }: { customers: CustomerRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: CustomerRow | null }>({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q)
    );
  }, [customers, search]);

  function openNew() {
    setForm(emptyForm);
    setError(null);
    setModal({ open: true, editing: null });
  }
  function openEdit(c: CustomerRow) {
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '' });
    setError(null);
    setModal({ open: true, editing: c });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name: form.name,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    };
    try {
      if (modal.editing) {
        await api(`/api/customers/${modal.editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api('/api/customers', { method: 'POST', body: JSON.stringify(payload) });
      }
      setModal({ open: false, editing: null });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: CustomerRow) {
    if (!window.confirm(`Delete customer "${c.name}"? Their past invoices are kept.`)) return;
    try {
      await api(`/api/customers/${c.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div>
      <PageHeader title="Customers" description="Everyone who has bought from you, in one directory.">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Add customer
        </Button>
      </PageHeader>

      <div className="mb-4 sm:w-72">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={customers.length === 0 ? 'No customers yet' : 'No matches'}
          description={
            customers.length === 0 ? 'Add a customer to attach them to invoices and track their spend.' : undefined
          }
        >
          {customers.length === 0 ? (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Add customer
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Customer</th>
              <th className="th">Contact</th>
              <th className="th text-right">Orders</th>
              <th className="th text-right">Lifetime spend</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.map((c) => (
              <tr key={c.id} className="transition hover:bg-slate-50">
                <td className="td">
                  <div className="font-medium text-slate-900">{c.name}</div>
                  {c.address ? <div className="text-xs text-slate-500">{c.address}</div> : null}
                </td>
                <td className="td">
                  <div className="text-sm">{c.email ?? '—'}</div>
                  <div className="text-xs text-slate-500">{c.phone ?? ''}</div>
                </td>
                <td className="td text-right">{c.orders}</td>
                <td className="td text-right font-semibold">
                  {c.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(c)} className="text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Modal open={modal.open} onClose={() => setModal({ open: false, editing: null })} title={modal.editing ? 'Edit customer' : 'Add customer'}>
        <form onSubmit={save} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          <div>
            <label className="label">Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal({ open: false, editing: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
