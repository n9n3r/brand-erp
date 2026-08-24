import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
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
      where: { id: params.id },
      data: {
        name: body.name.trim(),
        email: body.email ? body.email.toLowerCase().trim() : null,
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

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const existing = await prisma.customer.findFirst({ where: { id: params.id, brandId: session.brandId } });
    if (!existing) throw new ApiError(404, 'Customer not found');

    // Past invoices are preserved (customerId set to null on delete).
    await prisma.customer.delete({ where: { id: params.id } });
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
