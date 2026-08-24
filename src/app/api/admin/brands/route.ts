import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiSuperAdmin } from '@/lib/api-auth';
import { adminBrandSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';
import { slugify } from '@/lib/format';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireApiSuperAdmin();
    const brands = await prisma.brand.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, products: true, sales: true } } },
    });
    return ok({ brands });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSuperAdmin();
    const body = adminBrandSchema.parse(await req.json());

    const name = body.name.trim();
    const conflicting = await prisma.brand.findFirst({ where: { name } });
    if (conflicting) throw new ApiError(409, 'A brand with this name already exists');

    let slug = slugify(name);
    if (await prisma.brand.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        slug,
        description: body.description ?? null,
        currency: body.currency.toUpperCase(),
      },
    });
    await recordUsage({
      userId: session.sub,
      action: 'BRAND_CREATED',
      detail: brand.name,
      req,
    });
    return ok({ brand }, 201);
  } catch (error) {
    return fail(error);
  }
}
