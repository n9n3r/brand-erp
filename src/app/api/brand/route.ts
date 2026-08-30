import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, ApiError } from '@/lib/api';
import { requireApiBrandUser, requireApiBrandAdmin } from '@/lib/api-auth';
import { brandSettingsSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

/** Brand settings as used by the Settings page. */
export async function GET() {
  try {
    const session = await requireApiBrandUser();
    const brand = await prisma.brand.findUnique({
      where: { id: session.brandId },
      select: {
        name: true,
        slug: true,
        description: true,
        currency: true,
        logoUrl: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!brand) throw new ApiError(404, 'Brand not found');
    return ok({ brand });
  } catch (error) {
    return fail(error);
  }
}

/** Brand admin updates name / description / currency. */
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireApiBrandAdmin();
    const body = brandSettingsSchema.parse(await req.json());

    const brand = await prisma.brand.findUnique({ where: { id: session.brandId } });
    if (!brand) throw new ApiError(404, 'Brand not found');

    if (body.name.trim() !== brand.name) {
      const conflicting = await prisma.brand.findFirst({
        where: { name: body.name.trim(), NOT: { id: brand.id } },
      });
      if (conflicting) throw new ApiError(409, 'Another brand already uses that name');
    }

    const updated = await prisma.brand.update({
      where: { id: brand.id },
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        currency: body.currency.toUpperCase(),
      },
    });
    await recordUsage({
      userId: session.sub,
      brandId: brand.id,
      action: 'BRAND_SETTINGS_UPDATED',
      detail: `${brand.name} → ${updated.name}`,
      req,
    });
    return ok({ brand: updated });
  } catch (error) {
    return fail(error);
  }
}
