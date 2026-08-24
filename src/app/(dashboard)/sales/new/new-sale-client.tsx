'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { Button, Card, PageHeader } from '@/components/ui';
import { money, r2 } from '@/lib/format';

type ProductOption = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  categoryName: string | null;
};
type CustomerOption = { id: string; name: string };
type Line = { productId: string; name: string; unitPrice: number; quantity: number; available: number };

export function NewSaleClient({
  products,
  customers,
  currency,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
  currency: string;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [pickProduct, setPickProduct] = useState('');
  const [pickQty, setPickQty] = useState('1');
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => {
    const subtotal = r2(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
    const total = r2(Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0)));
    const paid = r2(Number(amountPaid || 0));
    const balance = r2(Math.max(0, total - paid));
    return { subtotal, total, paid, balance };
  }, [lines, discount, tax, amountPaid]);

  const selectedProduct = products.find((p) => p.id === pickProduct);

  function addLine() {
    if (!selectedProduct) return;
    const qty = Math.max(1, Math.floor(Number(pickQty || 1)));
    const existing = lines.find((l) => l.productId === selectedProduct.id);
    if (existing) {
      setLines(
        lines.map((l) =>
          l.productId === selectedProduct.id
            ? { ...l, quantity: Math.min(l.quantity + qty, l.available) }
            : l
        )
      );
    } else {
      setLines([
        ...lines,
        {
          productId: selectedProduct.id,
          name: selectedProduct.name,
          unitPrice: selectedProduct.price,
          quantity: Math.min(qty, selectedProduct.quantity),
          available: selectedProduct.quantity,
        },
      ]);
    }
    setPickProduct('');
    setPickQty('1');
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines(lines.map((l) => (l.productId === key ? { ...l, ...patch } : l)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) {
      setError('Add at least one product to the sale');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ id: string; invoiceNumber: string }>('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customerId || null,
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
          discount: Number(discount || 0),
          tax: Number(tax || 0),
          amountPaid: Number(amountPaid || 0),
          notes: notes.trim() || null,
        }),
      });
      router.push(`/invoices/${res.id}?created=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record sale');
      setBusy(false);
    }
  }

  const currencySymbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : `${currency} `;

  return (
    <form onSubmit={submit}>
      <PageHeader title="New sale" description="Add products, take payment, and the invoice generates itself.">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || lines.length === 0}>
          <ShoppingCart className="h-4 w-4" /> {busy ? 'Recording…' : 'Complete sale'}
        </Button>
      </PageHeader>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Customer</h2>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in customer (no record)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Items</h2>
            {products.length === 0 ? (
              <p className="text-sm text-slate-500">
                No active products. Add products in Inventory first.
              </p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <select className="input sm:flex-1" value={pickProduct} onChange={(e) => setPickProduct(e.target.value)}>
                  <option value="">Select a product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                      {p.name} · {money(p.price, currency)} · {p.quantity <= 0 ? 'out of stock' : `${p.quantity} in stock`}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  className="input sm:w-24"
                  value={pickQty}
                  onChange={(e) => setPickQty(e.target.value)}
                  aria-label="Quantity"
                />
                <Button type="button" variant="dark" onClick={addLine} disabled={!pickProduct}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            )}

            {lines.length > 0 ? (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-2 pr-4">Product</th>
                      <th className="px-4 py-2">Price</th>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2 text-right">Line total</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((l) => (
                      <tr key={l.productId}>
                        <td className="py-2 pr-4 font-medium text-slate-800">{l.name}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                            value={l.unitPrice}
                            onChange={(e) => updateLine(l.productId, { unitPrice: Number(e.target.value || 0) })}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="rounded-md border border-slate-300 p-1 hover:bg-slate-50"
                              onClick={() =>
                                updateLine(l.productId, { quantity: Math.max(1, l.quantity - 1) })
                              }
                              aria-label="Decrease"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={l.available}
                              className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
                              value={l.quantity}
                              onChange={(e) =>
                                updateLine(l.productId, {
                                  quantity: Math.max(1, Math.min(l.available, Number(e.target.value || 1))),
                                })
                              }
                            />
                            <button
                              type="button"
                              className="rounded-md border border-slate-300 p-1 hover:bg-slate-50"
                              onClick={() =>
                                updateLine(l.productId, { quantity: Math.min(l.available, l.quantity + 1) })
                              }
                              aria-label="Increase"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-[11px] text-slate-400">{l.available} avail.</span>
                        </td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {money(l.unitPrice * l.quantity, currency)}
                        </td>
                        <td className="pl-2">
                          <button
                            type="button"
                            className="rounded-md p-1 text-red-500 hover:bg-red-50"
                            onClick={() => setLines(lines.filter((x) => x.productId !== l.productId))}
                            aria-label="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Notes</h2>
            <textarea
              className="input"
              rows={2}
              placeholder="Delivery instructions, payment reference…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card className="p-5 lg:sticky lg:top-6">
            <h2 className="mb-4 font-semibold text-slate-900">Summary</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="font-medium">{money(totals.subtotal, currency)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Discount</dt>
                <dd className="flex items-center gap-1">
                  <span className="text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Tax</dt>
                <dd className="flex items-center gap-1">
                  <span className="text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                  />
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
                <dt className="font-semibold text-slate-900">Total</dt>
                <dd className="font-bold text-slate-900">{money(totals.total, currency)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
                <dt className="text-slate-500">Amount paid</dt>
                <dd className="flex items-center gap-1">
                  <span className="text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Balance due</dt>
                <dd className={`font-semibold ${totals.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {money(totals.balance, currency)}
                </dd>
              </div>
            </dl>
            <Button type="submit" className="mt-5 w-full" disabled={busy || lines.length === 0}>
              {busy ? 'Recording…' : `Complete sale · ${money(totals.total, currency)}`}
            </Button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Status is set automatically: paid, partial or unpaid.
            </p>
          </Card>
        </div>
      </div>
    </form>
  );
}
