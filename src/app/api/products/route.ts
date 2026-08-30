import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, ApiError } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { productSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';
import { num } from '@/lib/format';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
    const products = await prisma.product.findMany({
      where: {
        brandId: session.brandId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { sku: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      include: { category: { select: { id: true, name: true } } },
    });
    return ok({
      products: products.map((p) => ({
        ...p,
        price: num(p.price),
        costPrice: p.costPrice === null ? null : num(p.costPrice),
      })),
    });
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
      const duplicate = await prisma.product.findFirst({ where: { brandId: session.brandId, sku } });
      if (duplicate) throw new ApiError(409, `A product with SKU "${sku}" already exists`);
    }
    if (body.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, brandId: session.brandId },
      });
      if (!category) throw new ApiError(400, 'Category not found');
    }

    const product = await prisma.product.create({
      data: {
        brandId: session.brandId,
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
      action: 'PRODUCT_CREATED',
      detail: product.name,
      req,
    });
    return ok(
      { product: { ...product, price: num(product.price), costPrice: product.costPrice ? num(product.costPrice) : null } },
      201,
    );
  } catch (error) {
    return fail(error);
  }
}
