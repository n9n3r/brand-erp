import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, ApiError } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { categorySchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

/** List the brand's manually-managed categories (with product counts). */
export async function GET() {
  try {
    const session = await requireApiBrandUser();
    const categories = await prisma.category.findMany({
      where: { brandId: session.brandId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return ok({ categories });
  } catch (error) {
    return fail(error);
  }
}

/** Create a category (unique per brand). */
export async function POST(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const body = categorySchema.parse(await req.json());
    const name = body.name.trim();

    const duplicate = await prisma.category.findFirst({
      where: { brandId: session.brandId, name: { equals: name, mode: 'insensitive' } },
    });
    if (duplicate) throw new ApiError(409, `A category named "${name}" already exists`);

    const category = await prisma.category.create({
      data: { brandId: session.brandId, name, description: body.description?.trim() || null },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'CATEGORY_CREATED',
      detail: category.name,
      req,
    });
    return ok({ category }, 201);
  } catch (error) {
    return fail(error);
  }
}
