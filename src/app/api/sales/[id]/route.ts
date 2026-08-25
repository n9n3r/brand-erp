import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { paymentSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';
import { num, r2 } from '@/lib/format';

export const runtime = 'nodejs';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const sale = await prisma.sale.findFirst({
      where: { id: params.id, brandId: session.brandId },
      include: { items: true, customer: true, soldBy: { select: { name: true } } },
    });
    if (!sale) throw new ApiError(404, 'Invoice not found');
    return ok({ sale });
  } catch (error) {
    return fail(error);
  }
}

/** Record payment and/or delivery status. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const body = paymentSchema.parse(await req.json());

    const sale = await prisma.sale.findFirst({ where: { id: params.id, brandId: session.brandId } });
    if (!sale) throw new ApiError(404, 'Invoice not found');

    const data: { amountPaid?: number; status?: 'PAID' | 'PARTIAL' | 'UNPAID'; deliveredAt?: Date | null } = {};

    if (body.amountPaid !== undefined) {
      const total = num(sale.total);
      const amountPaid = r2(Math.min(body.amountPaid, total));
      data.amountPaid = amountPaid;
      data.status = amountPaid >= total - 0.001 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'UNPAID';
    }
    if (body.delivered !== undefined) {
      data.deliveredAt = body.delivered ? new Date() : null;
    }

    const updated = await prisma.sale.update({ where: { id: sale.id }, data });

    if (body.delivered !== undefined) {
      await recordUsage({
        userId: session.sub,
        brandId: session.brandId,
        action: 'SALE_DELIVERY',
        detail: `${updated.invoiceNumber} · ${body.delivered ? 'delivered' : 'delivery pending'}`,
        req,
      });
    }
    if (body.amountPaid !== undefined) {
      await recordUsage({
        userId: session.sub,
        brandId: session.brandId,
        action: 'SALE_PAYMENT',
        detail: `${updated.invoiceNumber} · paid ${data.amountPaid}/${num(sale.total)}`,
        req,
      });
    }
    return ok({ sale: updated });
  } catch (error) {
    return fail(error);
  }
}
