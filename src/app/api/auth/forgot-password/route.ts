import type { NextRequest } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { fail, ok } from '@/lib/api';
import { forgotPasswordSchema } from '@/lib/validation';
import { sendMail } from '@/lib/mail';

export const runtime = 'nodejs';

function resetEmailHtml(link: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
    <h2 style="color:#0f172a">Reset your password</h2>
    <p style="color:#334155">We received a request to reset your MyBrand password. Click the button below — the link is valid for 1 hour.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="background:#4f46e5;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Choose a new password</a>
    </p>
    <p style="color:#64748b;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
  </div>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = forgotPasswordSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    let devLink: string | undefined;
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // Invalidate any previous outstanding tokens for this user.
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const appUrl = process.env.APP_URL || req.nextUrl.origin;
      const link = `${appUrl.replace(/\/$/, '')}/reset-password/${token}`;
      const { delivered } = await sendMail({
        to: email,
        subject: 'Reset your MyBrand password',
        text: `Reset your password: ${link} (valid for 1 hour)`,
        html: resetEmailHtml(link),
      });
      if (!delivered && process.env.NODE_ENV !== 'production') {
        devLink = link;
      }
    }

    // Always the same response whether or not the account exists.
    return ok({
      message: 'If an account exists for that email, a reset link has been sent.',
      ...(devLink ? { devLink } : {}),
    });
  } catch (error) {
    return fail(error);
  }
}
