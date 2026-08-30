import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

/**
 * Email-verification tokens: 32 random bytes, stored only as SHA-256 hashes,
 * single-use, 24h expiry. Issuing a new token invalidates any previous
 * unused one (same protocol as password resets).
 */
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export function mintToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, hash: sha256(token) };
}

export async function issueVerificationToken(user: { id: string; email: string; name: string }) {
  // Invalidate previous unused tokens (single active link at a time).
  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  const { token, hash } = mintToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const link = `${process.env.APP_URL ?? ''}/api/auth/verify-email?token=${token}`;
  await sendEmail(
    user.email,
    'Verify your MyBrand email',
    `Hi ${user.name},\n\nPlease verify your email address for your MyBrand workspace by opening this link (valid for 24 hours):\n\n${link}\n\nIf you didn't sign up for MyBrand you can ignore this email.`,
  );
}

export async function consumeVerificationToken(token: string): Promise<{ ok: true } | { ok: false; reason: 'invalid' | 'used' | 'expired' }> {
  if (!token) return { ok: false, reason: 'invalid' };
  const found = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!found) return { ok: false, reason: 'invalid' };
  if (found.usedAt) return { ok: false, reason: 'used' };
  if (found.expiresAt < new Date()) return { ok: false, reason: 'expired' };

  await prisma.user.update({
    where: { id: found.userId },
    data: { emailVerifiedAt: new Date() },
  });
  await prisma.emailVerificationToken.update({
    where: { id: found.id },
    data: { usedAt: new Date() },
  });
  return { ok: true };
}
