import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, ApiError } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { customerSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const body = customerSchema.parse(await req.json());

    const existing = await prisma.customer.findFirst({ where: { id: params.id, brandId: session.brandId } });
    if (!existing) throw new ApiError(404, 'Customer not found');

    const customer = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: body.name.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
      },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'CUSTOMER_UPDATED',
      detail: customer.name,
      req,
    });
    return ok({ customer });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Delete a customer. Past invoices keep the name snapshot (Sale.customer is
 * SetNull) so invoice history survives.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const existing = await prisma.customer.findFirst({ where: { id: params.id, brandId: session.brandId } });
    if (!existing) throw new ApiError(404, 'Customer not found');

    await prisma.customer.delete({ where: { id: existing.id } });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'CUSTOMER_DELETED',
      detail: existing.name,
      req,
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
