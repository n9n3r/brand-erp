'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { Badge, Button, Card, PageHeader, StatCard } from '@/components/ui';
import { money, num, r2 } from '@/lib/format';

type Product = {
  id: string;
  name: string;
  categoryName: string | null;
  price: number;
  stock: number;
};

type Line = { productId: string; quantity: number; unitPrice: number };

export function NewSaleClient({
  products,
  customers,
  currency,
}: {
  products: Product[];
  customers: { id: string; name: string }[];
  currency: string;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function addProduct(productId: string) {
    const product = byId.get(productId);
    if (!product) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      const currentQty = existing?.quantity ?? 0;
      if (currentQty + 1 > product.stock) return prev; // capped by available stock
      if (existing) {
        return prev.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId, quantity: 1, unitPrice: product.price }];
    });
  }

  function setQuantity(productId: string, quantity: number) {
    const product = byId.get(productId);
    const capped = Math.min(Math.max(1, quantity), product?.stock ?? 1);
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity: capped } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  const subtotal = r2(lines.reduce((s, l) => s + r2(l.unitPrice * l.quantity), 0));
  const discountNum = num(Number(discount || 0));
  const taxNum = num(Number(tax || 0));
  const total = r2(subtotal - discountNum + taxNum);
  const paidNum = num(Number(amountPaid || 0));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) {
      setError('Add at least one product to the sale');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ sale: { id: string } }>('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customerId || null,
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
          discount: discountNum,
          tax: taxNum,
          amountPaid: r2(Math.min(paidNum, Math.max(0, total))),
          notes: notes.trim() || null,
        }),
      });
      router.push(`/invoices/${data.sale.id}?created=1`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="New sale" description="Pick products, take payment, and we'll issue the invoice." />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Product picker */}
        <div className="lg:col-span-3">
          <Card className="p-4">
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Products ({products.length} in stock)
            </p>
            {products.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No products in stock — add some in Inventory first.
              </p>
            ) : (
              <div className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {products.map((p) => {
                  const inCart = lines.find((l) => l.productId === p.id)?.quantity ?? 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p.id)}
                      className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-800">{p.name}</span>
                        {inCart > 0 ? <Badge tone="indigo">×{inCart}</Badge> : null}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span>{p.categoryName ?? 'Uncategorised'}</span>
                        <span className="font-semibold text-slate-700">{money(p.price, currency)}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">{p.stock} in stock</div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Cart + totals */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
              <ShoppingCart className="h-4 w-4" /> Sale ({lines.length} item{lines.length === 1 ? '' : 's'})
            </h2>

            {lines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                Tap a product to add it.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lines.map((l) => {
                  const p = byId.get(l.productId);
                  if (!p) return null;
                  return (
                    <li key={l.productId} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">{money(l.unitPrice, currency)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 p-1 text-slate-500 transition hover:bg-slate-50"
                          onClick={() => setQuantity(l.productId, l.quantity - 1)}
                          aria-label={`Decrease ${p.name}`}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          className="w-12 rounded-lg border border-slate-200 px-1 py-1 text-center text-sm"
                          type="number"
                          min={1}
                          max={p.stock}
                          value={l.quantity}
                          onChange={(e) => setQuantity(l.productId, Number(e.target.value || 1))}
                        />
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 p-1 text-slate-500 transition hover:bg-slate-50"
                          onClick={() => setQuantity(l.productId, l.quantity + 1)}
                          aria-label={`Increase ${p.name}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="w-20 text-right text-sm font-semibold">
                        {money(r2(l.unitPrice * l.quantity), currency)}
                      </span>
                      <button
                        type="button"
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        onClick={() => removeLine(l.productId)}
                        aria-label={`Remove ${p.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <form onSubmit={submit} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <div>
                <label className="label">Customer</label>
                <select
                  className="input"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">Walk-in customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Discount</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">Tax</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="label">Amount paid</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={`Total: ${money(Math.max(0, total), currency)}`}
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <input
                  className="input"
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional note on the invoice"
                />
              </div>

              <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{money(subtotal, currency)}</span>
                </div>
                {discountNum > 0 ? (
                  <div className="flex justify-between text-red-600">
                    <span>Discount</span>
                    <span>−{money(discountNum, currency)}</span>
                  </div>
                ) : null}
                {taxNum > 0 ? (
                  <div className="flex justify-between text-slate-500">
                    <span>Tax</span>
                    <span>{money(taxNum, currency)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-slate-900">
                  <span>Total</span>
                  <span>{money(Math.max(0, total), currency)}</span>
                </div>
                {paidNum > 0 ? (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Balance</span>
                    <span>{money(Math.max(0, r2(total - paidNum)), currency)}</span>
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={busy || lines.length === 0}>
                {busy ? 'Recording…' : `Record sale · ${money(Math.max(0, total), currency)}`}
              </Button>
            </form>
          </Card>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <StatCard label="Items" value={String(lines.reduce((s, l) => s + l.quantity, 0))} />
            <StatCard label="Cart total" value={money(Math.max(0, total), currency)} />
          </div>
        </div>
      </div>
    </div>
  );
}
