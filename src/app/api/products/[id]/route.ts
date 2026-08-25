import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { productSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const body = productSchema.parse(await req.json());

    const existing = await prisma.product.findFirst({ where: { id: params.id, brandId: session.brandId } });
    if (!existing) throw new ApiError(404, 'Product not found');

    const sku = body.sku?.trim() || null;
    if (sku) {
      const dupe = await prisma.product.findFirst({
        where: { brandId: session.brandId, sku, NOT: { id: params.id } },
      });
      if (dupe) throw new ApiError(409, `SKU "${sku}" is already used by another product`);
    }
    if (body.categoryId) {
      const cat = await prisma.category.findFirst({ where: { id: body.categoryId, brandId: session.brandId } });
      if (!cat) throw new ApiError(400, 'Category not found');
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: body.name.trim(),
        sku,
        categoryId: body.categoryId || null,
        description: body.description ?? null,
        costPrice: body.costPrice ?? null,
        price: body.price,
        quantity: body.quantity,
        reorderLevel: body.reorderLevel,
        isActive: body.isActive,
      },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'PRODUCT_UPDATED',
      detail: product.name,
      req,
    });
    return ok({ product });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const existing = await prisma.product.findFirst({ where: { id: params.id, brandId: session.brandId } });
    if (!existing) throw new ApiError(404, 'Product not found');

    // Past sale items keep their name/price snapshot (productId set to null).
    await prisma.product.delete({ where: { id: params.id } });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'PRODUCT_DELETED',
      detail: existing.name,
      req,
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
