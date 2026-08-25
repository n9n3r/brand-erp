import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiBrandAdmin, requireApiBrandUser } from '@/lib/api-auth';
import { brandSettingsSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await requireApiBrandUser();
    const brand = await prisma.brand.findUnique({
      where: { id: session.brandId },
      select: { id: true, name: true, slug: true, description: true, currency: true, isActive: true },
    });
    if (!brand) throw new ApiError(404, 'Brand not found');
    return ok({ brand });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireApiBrandAdmin();
    const body = brandSettingsSchema.parse(await req.json());

    const name = body.name.trim();
    const conflicting = await prisma.brand.findFirst({
      where: { name, NOT: { id: session.brandId } },
    });
    if (conflicting) throw new ApiError(409, 'Another brand already uses that name');

    const brand = await prisma.brand.update({
      where: { id: session.brandId },
      data: { name, description: body.description ?? null, currency: body.currency.toUpperCase() },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'BRAND_SETTINGS_UPDATED',
      detail: name,
      req,
    });
    return ok({ brand });
  } catch (error) {
    return fail(error);
  }
}
