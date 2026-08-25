import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { requireBrandSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fmtDate, fmtDateTime, money, num } from '@/lib/format';
import { Badge, StatusBadge } from '@/components/ui';
import { LogoMark } from '@/components/logo';
import { PrintButton } from '@/components/print-button';
import { PaymentForm } from './payment-form';
import { DeliveryToggle } from './delivery-toggle';

export const metadata: Metadata = { title: 'Invoice' };

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { created?: string };
}) {
  const session = await requireBrandSession();
  const sale = await prisma.sale.findFirst({
    where: { id: params.id, brandId: session.brandId },
    include: {
      items: true,
      customer: true,
      soldBy: { select: { name: true } },
      brand: { select: { name: true, description: true, currency: true, logoUrl: true } },
    },
  });
  if (!sale) notFound();

  const currency = sale.brand.currency;
  const total = num(sale.total);
  const paid = num(sale.amountPaid);
  const balance = Math.max(0, total - paid);
  const justCreated = searchParams.created === '1';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> All invoices
        </Link>
        <div className="flex items-center gap-2">
          <PrintButton />
        </div>
      </div>

      {justCreated ? (
        <div className="no-print mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5" /> Sale recorded — invoice {sale.invoiceNumber} created.
        </div>
      ) : null}

      <div className="print-sheet rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        {/* Header */}
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              {sale.brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sale.brand.logoUrl} alt={`${sale.brand.name} logo`} className="h-12 w-12 rounded-xl object-contain" />
              ) : (
                <LogoMark size={36} />
              )}
              <span className="text-lg font-bold text-slate-900">{sale.brand.name}</span>
            </div>
            {sale.brand.description ? (
              <p className="mt-1 max-w-xs text-xs text-slate-500">{sale.brand.description}</p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <h1 className="text-2xl font-extrabold uppercase tracking-tight text-slate-900">Invoice</h1>
            <p className="mt-1 font-mono text-sm text-slate-600">{sale.invoiceNumber}</p>
            <div className="mt-2">
              <StatusBadge status={sale.status} />
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid gap-6 border-b border-slate-200 py-8 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Billed to</p>
            <p className="mt-1 font-medium text-slate-900">{sale.customer?.name ?? 'Walk-in customer'}</p>
            {sale.customer?.phone ? <p className="text-sm text-slate-500">{sale.customer.phone}</p> : null}
            {sale.customer?.email ? <p className="text-sm text-slate-500">{sale.customer.email}</p> : null}
            {sale.customer?.address ? <p className="text-sm text-slate-500">{sale.customer.address}</p> : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date issued</p>
            <p className="mt-1 font-medium text-slate-900">{fmtDate(sale.soldAt)}</p>
            {sale.soldBy ? (
              <p className="mt-1 text-xs text-slate-500">Recorded by {sale.soldBy.name}</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment</p>
            <p className="mt-1 font-medium text-slate-900">
              Paid: {money(paid, currency)}
            </p>
            {balance > 0.001 ? (
              <p className="mt-1 text-sm text-amber-600 font-medium">Balance: {money(balance, currency)}</p>
            ) : (
              <p className="mt-1 text-sm text-emerald-600 font-medium">Fully settled</p>
            )}
          </div>
        </div>

        {/* Delivery status (app chrome only — not printed) */}
        <div className="no-print mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <DeliveryToggle saleId={sale.id} delivered={!!sale.deliveredAt} deliveredAt={sale.deliveredAt} />
        </div>

        {/* Items */}
        <table className="mt-8 min-w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-4">Item</th>
              <th className="px-4 py-2 text-right">Unit price</th>
              <th className="px-4 py-2 text-center">Qty</th>
              <th className="py-2 pl-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 pr-4 font-medium text-slate-800">{item.productName}</td>
                <td className="px-4 py-3 text-right text-slate-600">{money(num(item.unitPrice), currency)}</td>
                <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                <td className="py-3 pl-4 text-right font-semibold text-slate-900">
                  {money(num(item.lineTotal), currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-medium">{money(num(sale.subtotal), currency)}</dd>
            </div>
            {num(sale.discount) > 0 ? (
              <div className="flex justify-between">
                <dt className="text-slate-500">Discount</dt>
                <dd className="font-medium text-red-600">−{money(num(sale.discount), currency)}</dd>
              </div>
            ) : null}
            {num(sale.tax) > 0 ? (
              <div className="flex justify-between">
                <dt className="text-slate-500">Tax</dt>
                <dd className="font-medium">{money(num(sale.tax), currency)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">{money(total, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Amount paid</dt>
              <dd className="font-medium">{money(paid, currency)}</dd>
            </div>
            {balance > 0.001 ? (
              <div className="flex justify-between">
                <dt className="font-semibold text-amber-600">Balance due</dt>
                <dd className="font-bold text-amber-600">{money(balance, currency)}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        {sale.notes ? (
          <div className="mt-8 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Notes: </span>
            {sale.notes}
          </div>
        ) : null}

        <p className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          Thank you for your business · Generated by MyBrand · {fmtDateTime(sale.createdAt)}
        </p>
      </div>

      {balance > 0.001 ? (
        <div className="no-print mt-6">
          <PaymentForm saleId={sale.id} balance={balance} currency={currency} />
        </div>
      ) : null}
    </div>
  );
}
