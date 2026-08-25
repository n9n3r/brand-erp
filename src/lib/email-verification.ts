/**
 * Email verification service (server-side).
 * Tokens: 32 random bytes, stored only as SHA-256 hashes, single-use,
 * 24-hour expiry. Issuing a new token invalidates previous ones.
 */
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mail';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function verificationEmailHtml(link: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
    <h2 style="color:#0f172a">Confirm your email</h2>
    <p style="color:#334155">Welcome to MyBrand! Click the button below to verify your email address. The link is valid for 24 hours.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="background:#4f46e5;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Verify my email</a>
    </p>
    <p style="color:#64748b;font-size:13px">Didn't create this account? You can safely ignore this email.</p>
  </div>`;
}

export async function issueEmailVerification(args: {
  userId: string;
  email: string;
  appUrl: string;
}): Promise<{ delivered: boolean; link: string }> {
  // Invalidate any outstanding tokens for this user first.
  await prisma.emailVerificationToken.updateMany({
    where: { userId: args.userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString('hex');
  await prisma.emailVerificationToken.create({
    data: {
      userId: args.userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const link = `${args.appUrl.replace(/\/$/, '')}/api/auth/verify-email?token=${token}`;
  const { delivered } = await sendMail({
    to: args.email,
    subject: 'Verify your MyBrand email address',
    text: `Welcome to MyBrand! Verify your email: ${link} (valid for 24 hours)`,
    html: verificationEmailHtml(link),
  });
  return { delivered, link };
}

export async function consumeEmailVerification(
  token: string
): Promise<{ ok: boolean; reason?: 'invalid' | 'inactive' }> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { isActive: true } } },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, reason: 'invalid' };
  }
  if (!record.user.isActive) {
    return { ok: false, reason: 'inactive' };
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
  return { ok: true };
}
