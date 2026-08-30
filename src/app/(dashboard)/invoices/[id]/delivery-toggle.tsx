'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, PackageCheck, Truck } from 'lucide-react';
import { api } from '@/lib/client';
import { Badge, Button } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';

/** Mark an invoice's items as delivered / not delivered (brand level). */
export function DeliveryToggle({
  saleId,
  delivered,
  deliveredAt,
}: {
  saleId: string;
  delivered: boolean;
  /** ISO string — Dates serialized across the RSC boundary arrive as strings. */
  deliveredAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await api(`/api/sales/${saleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ delivered: !delivered }),
      });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5">
        {delivered ? (
          <PackageCheck className="h-5 w-5 text-emerald-600" />
        ) : (
          <Truck className="h-5 w-5 text-slate-400" />
        )}
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Delivery:{' '}
            {delivered ? (
              <Badge tone="green">delivered</Badge>
            ) : (
              <Badge tone="amber">not delivered</Badge>
            )}
          </p>
          <p className="text-xs text-slate-500">
            {delivered && deliveredAt
              ? `Marked delivered ${fmtDateTime(deliveredAt)}`
              : 'Items on this invoice have not been delivered yet.'}
          </p>
        </div>
      </div>
      <Button variant={delivered ? 'secondary' : 'primary'} onClick={toggle} disabled={busy} className="shrink-0">
        {delivered ? <CheckCircle2 className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
        {busy ? 'Updating…' : delivered ? 'Mark as not delivered' : 'Mark as delivered'}
      </Button>
    </div>
  );
}
