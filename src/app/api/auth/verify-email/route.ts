import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireApiUser } from '@/lib/api-auth';
import { consumeVerificationToken, issueVerificationToken } from '@/lib/email-verification';

export const runtime = 'nodejs';

/** GET /api/auth/verify-email?token=… — the link from the verification email. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const result = await consumeVerificationToken(token);
  return NextResponse.redirect(
    new URL(result.ok ? '/login?verified=1' : '/login?verifyFailed=1', req.url),
  );
}

/** POST — resend the verification email (authenticated, unverified users only). */
export async function POST() {
  try {
    const session = await requireApiUser();
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    });
    if (!user) throw new Error('Account no longer exists');
    if (user.emailVerifiedAt) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }
    await issueVerificationToken(user);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
