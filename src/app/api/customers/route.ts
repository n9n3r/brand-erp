import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { customerSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const q = req.nextUrl.searchParams.get('q')?.trim();
    const customers = await prisma.customer.findMany({
      where: {
        brandId: session.brandId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
    return ok({ customers });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const body = customerSchema.parse(await req.json());

    const customer = await prisma.customer.create({
      data: {
        brandId: session.brandId,
        name: body.name.trim(),
        email: body.email ? body.email.toLowerCase().trim() : null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
      },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'CUSTOMER_CREATED',
      detail: customer.name,
      req,
    });
    return ok({ customer }, 201);
  } catch (error) {
    return fail(error);
  }
}
