import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiBrandAdmin } from '@/lib/api-auth';
import { staffCreateSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/password';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

/** Brand admin lists their team. */
export async function GET() {
  try {
    const session = await requireApiBrandAdmin();
    const users = await prisma.user.findMany({
      where: { brandId: session.brandId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        loginCount: true,
      },
    });
    return ok({ users });
  } catch (error) {
    return fail(error);
  }
}

/** Brand admin adds a staff/admin user to their own brand. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireApiBrandAdmin();
    const body = staffCreateSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, 'A user with this email already exists');

    const user = await prisma.user.create({
      data: {
        email,
        name: body.name.trim(),
        passwordHash: await hashPassword(body.password),
        role: body.role,
        brandId: session.brandId,
      },
      select: { id: true, email: true, name: true, role: true },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'STAFF_CREATED',
      detail: `${user.email} (${user.role === 'BRAND_ADMIN' ? 'admin' : 'staff'})`,
      req,
    });
    return ok({ user }, 201);
  } catch (error) {
    return fail(error);
  }
}
