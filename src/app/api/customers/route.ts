import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { customerSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';
import { num, r2 } from '@/lib/format';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
    const customers = await prisma.customer.findMany({
      where: {
        brandId: session.brandId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 300,
      include: { _count: { select: { sales: true } }, sales: { select: { total: true } } },
    });
    return ok({
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        createdAt: c.createdAt,
        orderCount: c._count.sales,
        lifetimeSpend: r2(c.sales.reduce((s, x) => s + num(x.total), 0)),
      })),
    });
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
        email: body.email?.trim() || null,
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
