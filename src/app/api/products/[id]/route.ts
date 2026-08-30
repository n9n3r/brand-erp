import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, ApiError } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { productSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';
import { num } from '@/lib/format';

export const runtime = 'nodejs';

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const body = productSchema.parse(await req.json());

    const existing = await prisma.product.findFirst({ where: { id: params.id, brandId: session.brandId } });
    if (!existing) throw new ApiError(404, 'Product not found');

    const sku = body.sku?.trim() || null;
    if (sku && sku !== existing.sku) {
      const duplicate = await prisma.product.findFirst({
        where: { brandId: session.brandId, sku, NOT: { id: existing.id } },
      });
      if (duplicate) throw new ApiError(409, `A product with SKU "${sku}" already exists`);
    }
    if (body.categoryId && body.categoryId !== existing.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, brandId: session.brandId },
      });
      if (!category) throw new ApiError(400, 'Category not found');
    }

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: body.name.trim(),
        sku,
        categoryId: body.categoryId ?? null,
        description: body.description?.trim() || null,
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
    return ok({
      product: { ...product, price: num(product.price), costPrice: product.costPrice ? num(product.costPrice) : null },
    });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Delete a product. Past invoices keep their snapshots: SaleItem.product
 * becomes null (SetNull) while productName/price stay on the line item.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const existing = await prisma.product.findFirst({ where: { id: params.id, brandId: session.brandId } });
    if (!existing) throw new ApiError(404, 'Product not found');

    await prisma.product.delete({ where: { id: existing.id } });
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
