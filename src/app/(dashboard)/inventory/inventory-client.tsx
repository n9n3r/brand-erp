'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderKanban, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { Badge, Button, Card, EmptyState, PageHeader, TableWrap } from '@/components/ui';
import { Modal } from '@/components/modal';
import { money } from '@/lib/format';
import type { InventoryCategoryRow, InventoryProductRow } from './page';

const emptyProduct = {
  name: '',
  sku: '',
  categoryId: '',
  description: '',
  price: '',
  costPrice: '',
  quantity: '0',
  reorderLevel: '5',
  isActive: true,
};

export function InventoryClient({
  products,
  categories,
  currency,
}: {
  products: InventoryProductRow[];
  categories: InventoryCategoryRow[];
  currency: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [productModal, setProductModal] = useState<{ open: boolean; editing: InventoryProductRow | null }>({
    open: false,
    editing: null,
  });
  const [form, setForm] = useState(emptyProduct);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.categoryName ?? '').toLowerCase().includes(q),
    );
  }, [products, search]);

  function openNew() {
    setForm(emptyProduct);
    setError(null);
    setProductModal({ open: true, editing: null });
  }

  function openEdit(p: InventoryProductRow) {
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      categoryId: p.categoryId ?? '',
      description: p.description ?? '',
      price: String(p.price),
      costPrice: p.costPrice === null ? '' : String(p.costPrice),
      quantity: String(p.quantity),
      reorderLevel: String(p.reorderLevel),
      isActive: p.isActive,
    });
    setError(null);
    setProductModal({ open: true, editing: p });
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name: form.name,
      sku: form.sku.trim() || null,
      categoryId: form.categoryId || null,
      description: form.description.trim() || null,
      price: Number(form.price || 0),
      costPrice: form.costPrice.trim() === '' ? null : Number(form.costPrice),
      quantity: Number(form.quantity || 0),
      reorderLevel: Number(form.reorderLevel || 0),
      isActive: form.isActive,
    };
    try {
      if (productModal.editing) {
        await api(`/api/products/${productModal.editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      }
      setProductModal({ open: false, editing: null });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(p: InventoryProductRow) {
    if (!window.confirm(`Delete product "${p.name}"? Past invoices keep their details.`)) return;
    try {
      await api(`/api/products/${p.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setCategoryError(null);
    try {
      await api('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategory.name, description: newCategory.description || null }),
      });
      setNewCategory({ name: '', description: '' });
      router.refresh();
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Create failed');
    }
  }

  async function removeCategory(c: InventoryCategoryRow) {
    if (
      !window.confirm(
        `Delete category "${c.name}"? Its ${c.productCount} product(s) become uncategorised.`,
      )
    )
      return;
    try {
      await api(`/api/categories/${c.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div>
      <PageHeader title="Inventory" description="Products, stock levels and your manually managed categories.">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Add product
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search name, SKU or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={products.length === 0 ? 'No products yet' : 'No matches'}
          description={
            products.length === 0 ? 'Add your first product to start tracking stock and selling.' : undefined
          }
        >
          {products.length === 0 ? (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Add product
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Product</th>
              <th className="th">SKU</th>
              <th className="th">Category</th>
              <th className="th text-right">Cost</th>
              <th className="th text-right">Price</th>
              <th className="th text-right">Stock</th>
              <th className="th">Status</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.map((p) => (
              <tr key={p.id} className={`transition hover:bg-slate-50 ${p.isActive ? '' : 'opacity-60'}`}>
                <td className="td font-medium">{p.name}</td>
                <td className="td font-mono text-xs text-slate-500">{p.sku ?? '—'}</td>
                <td className="td">
                  {p.categoryName ? <Badge tone="indigo">{p.categoryName}</Badge> : <span className="text-slate-400">—</span>}
                </td>
                <td className="td text-right text-slate-500">
                  {p.costPrice === null ? '—' : money(p.costPrice, currency)}
                </td>
                <td className="td text-right font-semibold">{money(p.price, currency)}</td>
                <td className="td text-right">
                  <span className={p.quantity <= p.reorderLevel ? 'font-semibold text-amber-600' : ''}>
                    {p.quantity}
                  </span>
                  {p.quantity <= p.reorderLevel ? (
                    <Badge tone={p.quantity === 0 ? 'red' : 'amber'} className="ml-2">
                      {p.quantity === 0 ? 'out of stock' : 'low'}
                    </Badge>
                  ) : null}
                </td>
                <td className="td">
                  <Badge tone={p.isActive ? 'green' : 'slate'}>{p.isActive ? 'active' : 'archived'}</Badge>
                </td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProduct(p)}
                      className="text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${p.name}`}
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

      {/* Categories */}
      <Card className="mt-6 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <FolderKanban className="h-4 w-4 text-brand-600" /> Categories ({categories.length})
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Organise products into categories you define. Deleting a category keeps its products (they become uncategorised).
        </p>
        {categories.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.id}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  {c.name} <span className="text-slate-400">({c.productCount})</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(c)}
                    className="ml-0.5 text-slate-400 transition hover:text-red-600"
                    aria-label={`Delete category ${c.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <form onSubmit={addCategory} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            className="input sm:w-52"
            required
            minLength={1}
            maxLength={60}
            placeholder="New category name"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
          />
          <input
            className="input sm:flex-1"
            maxLength={300}
            placeholder="Description (optional)"
            value={newCategory.description}
            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
          />
          <Button type="submit" variant="secondary" className="shrink-0">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>
        {categoryError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {categoryError}
          </div>
        ) : null}
      </Card>

      {/* Product modal */}
      <Modal
        open={productModal.open}
        onClose={() => setProductModal({ open: false, editing: null })}
        title={productModal.editing ? `Edit — ${productModal.editing.name}` : 'Add product'}
      >
        <form onSubmit={saveProduct} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Name *</label>
              <input
                className="input"
                required
                minLength={1}
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">SKU</label>
              <input
                className="input"
                maxLength={40}
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="AMK-101"
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Selling price ({currency}) *</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Cost price ({currency})</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Stock quantity *</label>
              <input
                className="input"
                type="number"
                step="1"
                min="0"
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Reorder level</label>
              <input
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={2}
                maxLength={500}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active (available to sell)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setProductModal({ open: false, editing: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
