import type { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { hashPassword } from '@/lib/password';
import { resetPasswordSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = resetPasswordSchema.parse(await req.json());
    const tokenHash = createHash('sha256').update(body.token).digest('hex');

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, isActive: true, brandId: true } } },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new ApiError(400, 'This reset link is invalid or has expired. Request a new one.');
    }
    if (!record.user.isActive) {
      throw new ApiError(403, 'This account has been deactivated. Contact your administrator.');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: await hashPassword(body.password),
          // Invalidate ALL existing sessions for this user (they were
          // authenticated with the old password).
          tokenVersion: { increment: 1 },
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await recordUsage({
      userId: record.userId,
      brandId: record.user.brandId,
      action: 'PASSWORD_RESET',
      req,
    });

    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
