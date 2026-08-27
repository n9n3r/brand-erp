import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, ApiError } from '@/lib/api';
import { resetPasswordSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/password';
import { sha256 } from '@/lib/email-verification';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = resetPasswordSchema.parse(await req.json());

    const found = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(body.token) },
      include: { user: { select: { id: true, brandId: true, email: true } } },
    });
    if (!found) throw new ApiError(400, 'This reset link is invalid or has expired');
    if (found.usedAt) throw new ApiError(400, 'This reset link has already been used');
    if (found.expiresAt < new Date()) throw new ApiError(400, 'This reset link has expired');

    await prisma.user.update({
      where: { id: found.userId },
      data: {
        passwordHash: await hashPassword(body.password),
        // Kill every existing session for this user (CHANGELOG-SECURITY).
        tokenVersion: { increment: 1 },
      },
    });
    await prisma.passwordResetToken.update({
      where: { id: found.id },
      data: { usedAt: new Date() },
    });

    await recordUsage({
      userId: found.userId,
      brandId: found.user.brandId,
      action: 'PASSWORD_RESET',
      detail: 'self-service reset (all sessions signed out)',
      req,
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
