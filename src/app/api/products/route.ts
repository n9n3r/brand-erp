import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { productSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const { searchParams } = req.nextUrl;
    const includeInactive = searchParams.get('includeInactive') === '1';
    const categoryId = searchParams.get('categoryId') || undefined;

    const products = await prisma.product.findMany({
      where: {
        brandId: session.brandId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: { name: 'asc' },
      include: { category: { select: { name: true } } },
    });
    return ok({ products });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const body = productSchema.parse(await req.json());

    const sku = body.sku?.trim() || null;
    if (sku) {
      const dupe = await prisma.product.findFirst({ where: { brandId: session.brandId, sku } });
      if (dupe) throw new ApiError(409, `SKU "${sku}" is already used by another product`);
    }
    if (body.categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: body.categoryId, brandId: session.brandId },
      });
      if (!cat) throw new ApiError(400, 'Category not found');
    }

    const product = await prisma.product.create({
      data: {
        brandId: session.brandId,
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
      action: 'PRODUCT_CREATED',
      detail: `${product.name} · stock ${product.quantity}`,
      req,
    });
    return ok({ product }, 201);
  } catch (error) {
    return fail(error);
  }
}
