'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { Badge, Button, Card, EmptyState, PageHeader, StatCard, TableWrap } from '@/components/ui';
import { Modal } from '@/components/modal';
import { money, fmtDate } from '@/lib/format';
import type { ExpenseRow } from './page';

const CATEGORY_SUGGESTIONS = [
  'Stock purchase',
  'Rent',
  'Salaries',
  'Transport & delivery',
  'Marketing & ads',
  'Packaging',
  'Utilities',
  'Equipment',
  'Bank charges',
  'Other',
];

const emptyForm = { category: '', description: '', amount: '', incurredAt: '' };

export function ExpensesClient({
  expenses,
  currency,
  totals,
}: {
  expenses: ExpenseRow[];
  currency: string;
  totals: { all: number; last30: number; thisMonth: number };
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: ExpenseRow | null }>({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter(
      (e) => e.category.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q)
    );
  }, [expenses, search]);

  function openNew() {
    setForm({ ...emptyForm, incurredAt: new Date().toISOString().slice(0, 10) });
    setError(null);
    setModal({ open: true, editing: null });
  }
  function openEdit(e: ExpenseRow) {
    setForm({
      category: e.category,
      description: e.description ?? '',
      amount: String(e.amount),
      incurredAt: e.incurredAt.slice(0, 10),
    });
    setError(null);
    setModal({ open: true, editing: e });
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      category: form.category,
      description: form.description.trim() || null,
      amount: Number(form.amount || 0),
      incurredAt: form.incurredAt ? new Date(`${form.incurredAt}T12:00:00`).toISOString() : undefined,
    };
    try {
      if (modal.editing) {
        await api(`/api/expenses/${modal.editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api('/api/expenses', { method: 'POST', body: JSON.stringify(payload) });
      }
      setModal({ open: false, editing: null });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove(e: ExpenseRow) {
    if (!window.confirm(`Delete expense "${e.category} · ${money(e.amount, currency)}"?`)) return;
    try {
      await api(`/api/expenses/${e.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div>
      <PageHeader title="Expenses" description="Money the business spends — stock, rent, transport, ads and more.">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Add expense
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="This month" value={money(totals.thisMonth, currency)} icon={Receipt} />
        <StatCard label="Last 30 days" value={money(totals.last30, currency)} />
        <StatCard label="All time" value={money(totals.all, currency)} sub={`${expenses.length} records`} />
      </div>

      <div className="mb-4 sm:w-72">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search category or note…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={expenses.length === 0 ? 'No expenses recorded' : 'No matches'}
          description={expenses.length === 0 ? 'Track your first expense to see spending totals here.' : undefined}
        >
          {expenses.length === 0 ? (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Add expense
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Date</th>
              <th className="th">Category</th>
              <th className="th">Note</th>
              <th className="th">Recorded by</th>
              <th className="th text-right">Amount</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.map((e) => (
              <tr key={e.id} className="transition hover:bg-slate-50">
                <td className="td whitespace-nowrap text-slate-500">{fmtDate(e.incurredAt)}</td>
                <td className="td">
                  <Badge tone="indigo">{e.category}</Badge>
                </td>
                <td className="td max-w-xs truncate text-slate-600">{e.description ?? '—'}</td>
                <td className="td text-slate-500">{e.createdByName ?? '—'}</td>
                <td className="td text-right font-semibold text-red-600">−{money(e.amount, currency)}</td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(e)} aria-label={`Edit ${e.category}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(e)}
                      className="text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${e.category}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Card className="mt-4 p-4">
        <p className="text-xs text-slate-400">
          Tip: expense totals for any date range also appear on the <strong>Reports</strong> page next to revenue,
          so you can see net position at a glance.
        </p>
      </Card>

      <Modal open={modal.open} onClose={() => setModal({ open: false, editing: null })} title={modal.editing ? 'Edit expense' : 'Add expense'}>
        <form onSubmit={save} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Category *</label>
              <input
                className="input"
                required
                list="expense-categories"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Stock purchase"
              />
              <datalist id="expense-categories">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">Amount *</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={form.incurredAt}
              onChange={(e) => setForm({ ...form, incurredAt: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Note</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. 2 cartons of serum bottles from supplier"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal({ open: false, editing: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save expense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
