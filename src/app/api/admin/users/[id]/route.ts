import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiSuperAdmin } from '@/lib/api-auth';
import { adminUserUpdateSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/password';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiSuperAdmin();
    const body = adminUserUpdateSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) throw new ApiError(404, 'User not found');

    // Guard: you cannot deactivate or demote yourself.
    if (user.id === session.sub && (body.isActive === false || (body.role && body.role !== 'SUPER_ADMIN'))) {
      throw new ApiError(400, 'You cannot deactivate or demote your own account');
    }
    // Guard: never remove the last active super admin.
    if (user.role === 'SUPER_ADMIN' && (body.isActive === false || (body.role && body.role !== 'SUPER_ADMIN'))) {
      const activeSuperAdmins = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', isActive: true, NOT: { id: user.id } },
      });
      if (activeSuperAdmins === 0) {
        throw new ApiError(400, 'Cannot remove the last active super admin');
      }
    }
    if (body.brandId) {
      const brand = await prisma.brand.findUnique({ where: { id: body.brandId } });
      if (!brand) throw new ApiError(400, 'Brand not found');
    }
    if (body.email) {
      const email = body.email.toLowerCase().trim();
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id: user.id } },
      });
      if (existing) throw new ApiError(409, 'Another user already uses that email');
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.email !== undefined ? { email: body.email.toLowerCase().trim() } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.brandId !== undefined
          ? { brandId: body.role === 'SUPER_ADMIN' || body.brandId === null ? null : body.brandId }
          : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.password
          ? {
              passwordHash: await hashPassword(body.password),
              // Kill the user's existing sessions after an admin password set.
              tokenVersion: { increment: 1 },
            }
          : {}),
      },
      select: { id: true, email: true, role: true, isActive: true, brandId: true },
    });

    await recordUsage({
      userId: session.sub,
      brandId: updated.brandId,
      action: 'USER_UPDATED',
      detail: `${user.email}${body.email ? ` → ${updated.email}` : ''}${body.password ? ' · password reset' : ''}${
        body.isActive !== undefined ? ` · ${body.isActive ? 'activated' : 'deactivated'}` : ''
      }`,
      req,
    });
    return ok({ user: updated });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Permanently delete a user. Their past invoices are preserved (soldBy is
 * nulled); their sessions, reset tokens and usage log links are cleaned up.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiSuperAdmin();
    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) throw new ApiError(404, 'User not found');
    if (user.id === session.sub) throw new ApiError(400, 'You cannot delete your own account');
    if (user.role === 'SUPER_ADMIN') {
      const activeSuperAdmins = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', isActive: true, NOT: { id: user.id } },
      });
      if (activeSuperAdmins === 0) throw new ApiError(400, 'Cannot delete the last super admin');
    }

    await prisma.user.delete({ where: { id: user.id } });
    await recordUsage({
      userId: session.sub,
      action: 'USER_DELETED',
      detail: user.email,
      req,
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
