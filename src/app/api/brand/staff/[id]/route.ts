import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiBrandAdmin } from '@/lib/api-auth';
import { staffUpdateSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/password';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

type Params = { params: { id: string } };

/**
 * Brand admin updates one of their own staff (activate/deactivate, promote/
 * demote, set password — which also kills that user's sessions).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandAdmin();
    const body = staffUpdateSchema.parse(await req.json());

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target || target.brandId !== session.brandId || target.role === 'SUPER_ADMIN') {
      throw new ApiError(404, 'Team member not found');
    }
    if (target.id === session.sub && (body.isActive === false || (body.role && body.role !== 'BRAND_ADMIN'))) {
      throw new ApiError(400, 'You cannot deactivate or demote your own account');
    }

    // Guard: never leave the brand without an active admin.
    const demotingOrDisabling =
      (body.role === 'BRAND_USER' || body.isActive === false) &&
      (target.role === 'BRAND_ADMIN' && target.isActive);
    if (demotingOrDisabling) {
      const otherActiveAdmins = await prisma.user.count({
        where: {
          brandId: session.brandId,
          role: 'BRAND_ADMIN',
          isActive: true,
          NOT: { id: target.id },
        },
      });
      if (otherActiveAdmins === 0) {
        throw new ApiError(400, 'This brand needs at least one active admin');
      }
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.password
          ? {
              passwordHash: await hashPassword(body.password),
              tokenVersion: { increment: 1 }, // kill existing sessions
            }
          : {}),
      },
      select: { id: true, email: true, isActive: true, role: true },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'STAFF_UPDATED',
      detail: `${target.email}${body.password ? ' · password set (sessions signed out)' : ''}${
        body.isActive !== undefined ? ` · ${body.isActive ? 'activated' : 'deactivated'}` : ''
      }${body.role !== undefined ? ` · role ${body.role}` : ''}`,
      req,
    });
    return ok({ user: updated });
  } catch (error) {
    return fail(error);
  }
}
