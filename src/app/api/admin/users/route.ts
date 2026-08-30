import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, ApiError } from '@/lib/api';
import { requireApiSuperAdmin } from '@/lib/api-auth';
import { adminUserSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/password';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

/** All platform users (for the admin Users page). */
export async function GET() {
  try {
    await requireApiSuperAdmin();
    const users = await prisma.user.findMany({
      orderBy: { loginCount: 'desc' },
      include: { brand: { select: { name: true } } },
    });
    return ok({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        emailVerifiedAt: u.emailVerifiedAt,
        lastLoginAt: u.lastLoginAt,
        loginCount: u.loginCount,
        brandId: u.brandId,
        brandName: u.brand?.name ?? null,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

/** Super admin creates a user for any brand (or a new super admin). */
export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSuperAdmin();
    const body = adminUserSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, 'A user with this email already exists');

    const isSuperAdmin = body.role === 'SUPER_ADMIN';
    const brandId = isSuperAdmin ? null : body.brandId ?? null;
    if (!brandId) {
      throw new ApiError(400, 'Choose a brand for this user');
    }
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw new ApiError(400, 'Brand not found');

    const user = await prisma.user.create({
      data: {
        email,
        name: body.name.trim(),
        passwordHash: await hashPassword(body.password),
        role: body.role,
        brandId,
      },
      select: { id: true, email: true, name: true, role: true },
    });
    await recordUsage({
      userId: session.sub,
      brandId,
      action: 'USER_CREATED',
      detail: `${user.email} (${user.role === 'SUPER_ADMIN' ? 'super admin' : `${brand.name}`})`,
      req,
    });
    return ok({ user }, 201);
  } catch (error) {
    return fail(error);
  }
}
