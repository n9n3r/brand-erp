import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiBrandAdmin } from '@/lib/api-auth';
import { logoSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

const MAX_BYTES = 400_000; // ~400 KB data-URL cap (client downscales to 512px)

/** Upload the brand logo (base64 data URL) — shown on invoices. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireApiBrandAdmin();
    const body = logoSchema.parse(await req.json());
    if (body.dataUrl.length > MAX_BYTES) {
      throw new ApiError(413, 'Logo is too large — please use an image under ~300 KB.');
    }
    await prisma.brand.update({
      where: { id: session.brandId },
      data: { logoUrl: body.dataUrl },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'BRAND_LOGO_UPDATED',
      detail: 'Logo uploaded',
      req,
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

/** Remove the brand logo (invoices fall back to the MyBrand mark). */
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireApiBrandAdmin();
    await prisma.brand.update({
      where: { id: session.brandId },
      data: { logoUrl: null },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'BRAND_LOGO_UPDATED',
      detail: 'Logo removed',
      req,
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
