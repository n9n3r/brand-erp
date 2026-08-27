import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, ApiError } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { categorySchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const body = categorySchema.parse(await req.json());
    const name = body.name.trim();

    const existing = await prisma.category.findFirst({ where: { id: params.id, brandId: session.brandId } });
    if (!existing) throw new ApiError(404, 'Category not found');

    if (name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await prisma.category.findFirst({
        where: { brandId: session.brandId, name: { equals: name, mode: 'insensitive' }, NOT: { id: existing.id } },
      });
      if (duplicate) throw new ApiError(409, `A category named "${name}" already exists`);
    }

    const category = await prisma.category.update({
      where: { id: existing.id },
      data: { name, description: body.description?.trim() || null },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'CATEGORY_UPDATED',
      detail: `${existing.name} → ${category.name}`,
      req,
    });
    return ok({ category });
  } catch (error) {
    return fail(error);
  }
}

/** Delete a category. Its products become uncategorised (categoryId → null). */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const existing = await prisma.category.findFirst({
      where: { id: params.id, brandId: session.brandId },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw new ApiError(404, 'Category not found');

    await prisma.category.delete({ where: { id: existing.id } });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'CATEGORY_DELETED',
      detail: `${existing.name} (${existing._count.products} products uncategorised)`,
      req,
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
