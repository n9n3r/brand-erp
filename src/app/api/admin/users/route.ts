import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiSuperAdmin } from '@/lib/api-auth';
import { adminUserSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/password';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireApiSuperAdmin();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
        brand: { select: { id: true, name: true } },
      },
    });
    return ok({ users });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSuperAdmin();
    const body = adminUserSchema.parse(await req.json());

    const email = body.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, 'A user with this email already exists');

    if (body.role !== 'SUPER_ADMIN' && !body.brandId) {
      throw new ApiError(400, 'Brand users must be assigned to a brand');
    }
    if (body.brandId) {
      const brand = await prisma.brand.findUnique({ where: { id: body.brandId } });
      if (!brand) throw new ApiError(400, 'Brand not found');
      if (!brand.isActive) throw new ApiError(400, 'Cannot add users to a deactivated brand');
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: body.name.trim(),
        passwordHash: await hashPassword(body.password),
        role: body.role,
        brandId: body.role === 'SUPER_ADMIN' ? null : body.brandId!,
      },
      select: { id: true, email: true, name: true, role: true, brandId: true },
    });
    await recordUsage({
      userId: session.sub,
      brandId: user.brandId,
      action: 'USER_CREATED',
      detail: `${user.email} (${user.role})`,
      req,
    });
    return ok({ user }, 201);
  } catch (error) {
    return fail(error);
  }
}
