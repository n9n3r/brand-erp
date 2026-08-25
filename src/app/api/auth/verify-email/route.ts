import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fail, ok } from '@/lib/api';
import { requireApiUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { consumeEmailVerification, issueEmailVerification } from '@/lib/email-verification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/verify-email?token=…
 * The link users click in the verification email. Marks the email verified
 * and redirects to the login page with a status flag.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const result = await consumeEmailVerification(token);
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set(result.ok ? 'verified' : 'verifyFailed', '1');
  return NextResponse.redirect(url);
}

/**
 * POST /api/auth/verify-email — resend the verification email
 * (for the logged-in unverified user; "Resend" button on the banner).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireApiUser();
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { email: true, emailVerifiedAt: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Account unavailable' }, { status: 401 });
    }
    if (user.emailVerifiedAt) {
      return ok({ message: 'Your email is already verified.' });
    }

    const appUrl = process.env.APP_URL || req.nextUrl.origin;
    const { delivered, link } = await issueEmailVerification({
      userId: session.sub,
      email: user.email,
      appUrl,
    });

    // In non-production without an email provider, hand back the link so the
    // flow stays testable (mirrors forgot-password behaviour).
    const devLink = !delivered && process.env.NODE_ENV !== 'production' ? link : undefined;
    return ok({
      message: 'Verification email sent — check your inbox.',
      ...(devLink ? { devLink } : {}),
    });
  } catch (error) {
    return fail(error);
  }
}
