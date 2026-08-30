import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';
import { forgotPasswordSchema } from '@/lib/validation';
import { sendEmail } from '@/lib/email';
import { mintToken } from '@/lib/email-verification';

export const runtime = 'nodejs';

/**
 * Always returns 200 so the endpoint can't be used to probe which emails are
 * registered. A token is only minted (and emailed) when the account exists.
 */
export async function POST(req: NextRequest) {
  try {
    const body = forgotPasswordSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Invalidate any previously issued, unused reset tokens for this user.
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      const { token, hash } = mintToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      const link = `${process.env.APP_URL ?? ''}/reset-password/${token}`;
      await sendEmail(
        user.email,
        'Reset your MyBrand password',
        `Hi ${user.name},\n\nReset your MyBrand password by opening this link (valid for 1 hour):\n\n${link}\n\nIf you didn't request this you can ignore this email.`,
      );
    }

    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
