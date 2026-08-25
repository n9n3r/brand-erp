import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { verifyPassword } from '@/lib/password';
import { loginSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession } from '@/lib/jwt';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      include: { brand: { select: { isActive: true } } },
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new ApiError(401, 'Invalid email or password');
    }
    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Contact your administrator.');
    }
    if (user.brandId && !user.brand?.isActive) {
      throw new ApiError(403, 'This brand has been deactivated. Contact the platform administrator.');
    }

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      brandId: user.brandId,
      tv: user.tokenVersion,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });
    await recordUsage({ userId: user.id, brandId: user.brandId, action: 'LOGIN', req });

    const res = ok({ ok: true, role: user.role });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    });
    return res;
  } catch (error) {
    return fail(error);
  }
}
