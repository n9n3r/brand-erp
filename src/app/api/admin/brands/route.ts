import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, ApiError } from '@/lib/api';
import { requireApiSuperAdmin } from '@/lib/api-auth';
import { adminBrandSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';
import { slugify } from '@/lib/format';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await requireApiSuperAdmin();
    const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
    const brands = await prisma.brand.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, products: true, sales: true } } },
    });
    return ok({ brands });
  } catch (error) {
    return fail(error);
  }
}

/** Super admin creates a brand workspace (a human must still add its users). */
export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSuperAdmin();
    const body = adminBrandSchema.parse(await req.json());
    const name = body.name.trim();

    const existing = await prisma.brand.findUnique({ where: { name } });
    if (existing) throw new ApiError(409, 'A brand with that name already exists');

    const baseSlug = slugify(name) || 'brand';
    let slug = baseSlug;
    for (let i = 2; await prisma.brand.findUnique({ where: { slug } }); i++) {
      slug = `${baseSlug}-${i}`;
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        slug,
        description: body.description?.trim() || null,
        currency: body.currency.toUpperCase(),
      },
    });
    await recordUsage({
      userId: session.sub,
      brandId: brand.id,
      action: 'BRAND_CREATED',
      detail: brand.name,
      req,
    });
    return ok({ brand }, 201);
  } catch (error) {
    return fail(error);
  }
}
