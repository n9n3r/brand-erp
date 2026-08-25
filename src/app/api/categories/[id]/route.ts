import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { categorySchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const body = categorySchema.parse(await req.json());

    const existing = await prisma.category.findFirst({ where: { id: params.id, brandId: session.brandId } });
    if (!existing) throw new ApiError(404, 'Category not found');

    const dupe = await prisma.category.findFirst({
      where: { brandId: session.brandId, name: body.name.trim(), NOT: { id: params.id } },
    });
    if (dupe) throw new ApiError(409, `Category "${body.name.trim()}" already exists`);

    const category = await prisma.category.update({
      where: { id: params.id },
      data: { name: body.name.trim(), description: body.description ?? null },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'CATEGORY_UPDATED',
      detail: category.name,
      req,
    });
    return ok({ category });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const existing = await prisma.category.findFirst({
      where: { id: params.id, brandId: session.brandId },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw new ApiError(404, 'Category not found');

    // Products become uncategorised (SetNull) — safe delete.
    await prisma.category.delete({ where: { id: params.id } });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'CATEGORY_DELETED',
      detail: `${existing.name} (${existing._count.products} products detached)`,
      req,
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
