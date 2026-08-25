'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { Badge, Button, Card, EmptyState, PageHeader, TableWrap } from '@/components/ui';
import { Modal } from '@/components/modal';
import type { CategoryRow, ProductRow } from './page';

const emptyProduct = {
  name: '',
  sku: '',
  categoryId: '',
  description: '',
  costPrice: '',
  price: '',
  quantity: '0',
  reorderLevel: '5',
  isActive: true,
};

const emptyCategory = { name: '', description: '' };

export function InventoryClient({
  products,
  categories,
}: {
  products: ProductRow[];
  categories: CategoryRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'products' | 'categories'>('products');
  const [search, setSearch] = useState('');

  const [productModal, setProductModal] = useState<{ open: boolean; editing: ProductRow | null }>({
    open: false,
    editing: null,
  });
  const [productForm, setProductForm] = useState(emptyProduct);
  const [categoryModal, setCategoryModal] = useState<{ open: boolean; editing: CategoryRow | null }>({
    open: false,
    editing: null,
  });
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.categoryName ?? '').toLowerCase().includes(q)
    );
  }, [products, search]);

  function openNewProduct() {
    setProductForm(emptyProduct);
    setError(null);
    setProductModal({ open: true, editing: null });
  }
  function openEditProduct(p: ProductRow) {
    setProductForm({
      name: p.name,
      sku: p.sku ?? '',
      categoryId: p.categoryId ?? '',
      description: p.description ?? '',
      costPrice: p.costPrice != null ? String(p.costPrice) : '',
      price: String(p.price),
      quantity: String(p.quantity),
      reorderLevel: String(p.reorderLevel),
      isActive: p.isActive,
    });
    setError(null);
    setProductModal({ open: true, editing: p });
  }
  function openNewCategory() {
    setCategoryForm(emptyCategory);
    setError(null);
    setCategoryModal({ open: true, editing: null });
  }
  function openEditCategory(c: CategoryRow) {
    setCategoryForm({ name: c.name, description: c.description ?? '' });
    setError(null);
    setCategoryModal({ open: true, editing: c });
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name: productForm.name,
      sku: productForm.sku.trim() || null,
      categoryId: productForm.categoryId || null,
      description: productForm.description.trim() || null,
      costPrice: productForm.costPrice === '' ? null : Number(productForm.costPrice),
      price: Number(productForm.price || 0),
      quantity: Number(productForm.quantity || 0),
      reorderLevel: Number(productForm.reorderLevel || 0),
      isActive: productForm.isActive,
    };
    try {
      if (productModal.editing) {
        await api(`/api/products/${productModal.editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
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

  async function deleteProduct(p: ProductRow) {
    if (!window.confirm(`Delete "${p.name}"? Past invoices keep their line items.`)) return;
    try {
      await api(`/api/products/${p.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = { name: categoryForm.name, description: categoryForm.description.trim() || null };
    try {
      if (categoryModal.editing) {
        await api(`/api/categories/${categoryModal.editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api('/api/categories', { method: 'POST', body: JSON.stringify(payload) });
      }
      setCategoryModal({ open: false, editing: null });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(c: CategoryRow) {
    if (
      !window.confirm(
        `Delete category "${c.name}"? ${c.productCount} product(s) will become uncategorised.`
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
      <PageHeader title="Inventory" description="Products, stock levels and your own categories.">
        {tab === 'products' ? (
          <Button onClick={openNewProduct}>
            <Plus className="h-4 w-4" /> Add product
          </Button>
        ) : (
          <Button onClick={openNewCategory}>
            <Plus className="h-4 w-4" /> Add category
          </Button>
        )}
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(['products', 'categories'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
                tab === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t} ({t === 'products' ? products.length : categories.length})
            </button>
          ))}
        </div>
        {tab === 'products' ? (
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search name, SKU, category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      {tab === 'products' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={products.length === 0 ? 'No products yet' : 'No matches'}
            description={
              products.length === 0
                ? 'Add your first product to start tracking stock and sales.'
                : 'Try a different search term.'
            }
          >
            {products.length === 0 ? (
              <Button onClick={openNewProduct}>
                <Plus className="h-4 w-4" /> Add product
              </Button>
            ) : null}
          </EmptyState>
        ) : (
          <TableWrap>
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Product</th>
                <th className="th">Category</th>
                <th className="th">SKU</th>
                <th className="th text-right">Price</th>
                <th className="th text-right">Cost</th>
                <th className="th text-right">Stock</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((p) => (
                <tr key={p.id} className={`transition hover:bg-slate-50 ${p.isActive ? '' : 'opacity-50'}`}>
                  <td className="td">
                    <div className="font-medium text-slate-900">{p.name}</div>
                    {!p.isActive ? <Badge tone="slate">archived</Badge> : null}
                  </td>
                  <td className="td">{p.categoryName ?? <span className="text-slate-400">—</span>}</td>
                  <td className="td font-mono text-xs">{p.sku ?? '—'}</td>
                  <td className="td text-right">{p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="td text-right text-slate-500">
                    {p.costPrice != null ? p.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="td text-right">
                    {p.quantity <= p.reorderLevel ? (
                      <Badge tone={p.quantity === 0 ? 'red' : 'amber'}>{p.quantity} left</Badge>
                    ) : (
                      <span className="font-medium">{p.quantity}</span>
                    )}
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditProduct(p)} aria-label={`Edit ${p.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProduct(p)}
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
        )
      ) : (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Category</th>
              <th className="th">Description</th>
              <th className="th text-right">Products</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {categories.map((c) => (
              <tr key={c.id} className="transition hover:bg-slate-50">
                <td className="td font-medium text-slate-900">{c.name}</td>
                <td className="td text-slate-500">{c.description ?? '—'}</td>
                <td className="td text-right">{c.productCount}</td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditCategory(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCategory(c)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="td py-10 text-center text-slate-500">
                  No categories yet — create one to organise your products.
                </td>
              </tr>
            ) : null}
          </tbody>
        </TableWrap>
      )}

      {/* Product modal */}
      <Modal
        open={productModal.open}
        onClose={() => setProductModal({ open: false, editing: null })}
        title={productModal.editing ? 'Edit product' : 'Add product'}
        wide
      >
        <form onSubmit={saveProduct} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Product name *</label>
              <input
                className="input"
                required
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Vitamin C Face Serum"
              />
            </div>
            <div>
              <label className="label">SKU</label>
              <input
                className="input"
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                placeholder="AMK-101"
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={productForm.categoryId}
                onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
              >
                <option value="">— Uncategorised —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Selling price *</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                required
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Cost price</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={productForm.costPrice}
                onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Quantity in stock *</label>
              <input
                className="input"
                type="number"
                min="0"
                required
                value={productForm.quantity}
                onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Reorder alert level</label>
              <input
                className="input"
                type="number"
                min="0"
                value={productForm.reorderLevel}
                onChange={(e) => setProductForm({ ...productForm, reorderLevel: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={2}
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={productForm.isActive}
                onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              Active (available for sale)
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setProductModal({ open: false, editing: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : productModal.editing ? 'Save changes' : 'Add product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category modal */}
      <Modal
        open={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, editing: null })}
        title={categoryModal.editing ? 'Edit category' : 'Add category'}
      >
        <form onSubmit={saveCategory} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          <div>
            <label className="label">Category name *</label>
            <input
              className="input"
              required
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="Serums"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCategoryModal({ open: false, editing: null })}>
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
