import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { categorySchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

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

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const body = categorySchema.parse(await req.json());
    const name = body.name.trim();

    const dupe = await prisma.category.findFirst({ where: { brandId: session.brandId, name } });
    if (dupe) throw new ApiError(409, `Category "${name}" already exists`);

    const category = await prisma.category.create({
      data: { brandId: session.brandId, name, description: body.description ?? null },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'CATEGORY_CREATED',
      detail: name,
      req,
    });
    return ok({ category }, 201);
  } catch (error) {
    return fail(error);
  }
}
