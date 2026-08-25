import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiSuperAdmin } from '@/lib/api-auth';
import { adminBrandUpdateSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireApiSuperAdmin();
    const brand = await prisma.brand.findUnique({
      where: { id: params.id },
      include: { _count: { select: { users: true, products: true, sales: true, customers: true } } },
    });
    if (!brand) throw new ApiError(404, 'Brand not found');
    return ok({ brand });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiSuperAdmin();
    const body = adminBrandUpdateSchema.parse(await req.json());

    const brand = await prisma.brand.findUnique({ where: { id: params.id } });
    if (!brand) throw new ApiError(404, 'Brand not found');

    if (body.name) {
      const conflicting = await prisma.brand.findFirst({ where: { name: body.name.trim(), NOT: { id: params.id } } });
      if (conflicting) throw new ApiError(409, 'Another brand already uses that name');
    }

    const updated = await prisma.brand.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description ?? null } : {}),
        ...(body.currency !== undefined ? { currency: body.currency.toUpperCase() } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    // Deactivating a brand locks out all of its users (they can be
    // re-enabled individually when the brand is reactivated).
    if (body.isActive === false) {
      await prisma.user.updateMany({ where: { brandId: params.id }, data: { isActive: false } });
    }

    await recordUsage({
      userId: session.sub,
      brandId: params.id,
      action: 'BRAND_UPDATED',
      detail: `${updated.name}${body.isActive !== undefined ? ` · ${body.isActive ? 'activated' : 'deactivated'}` : ''}`,
      req,
    });
    return ok({ brand: updated });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Permanently delete a brand and everything under it (users, products,
 * invoices, expenses, customers, categories). Requires a body of
 * { confirm: "<exact brand name>" } as a safety against accidents.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiSuperAdmin();
    const body = z.object({ confirm: z.string().min(1) }).parse(await req.json().catch(() => ({})));

    const brand = await prisma.brand.findUnique({
      where: { id: params.id },
      include: { _count: { select: { users: true, sales: true, products: true, expenses: true } } },
    });
    if (!brand) throw new ApiError(404, 'Brand not found');
    if (body.confirm.trim() !== brand.name) {
      throw new ApiError(400, 'Type the exact brand name to confirm deletion');
    }

    await prisma.brand.delete({ where: { id: brand.id } });
    await recordUsage({
      userId: session.sub,
      action: 'BRAND_DELETED',
      detail: `${brand.name} (users: ${brand._count.users}, invoices: ${brand._count.sales}, products: ${brand._count.products}, expenses: ${brand._count.expenses})`,
      req,
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
