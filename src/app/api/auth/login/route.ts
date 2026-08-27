import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, ApiError } from '@/lib/api';
import { loginSchema } from '@/lib/validation';
import { verifyPassword } from '@/lib/password';
import { SESSION_COOKIE, issueSession } from '@/lib/jwt';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      include: { brand: { select: { id: true, name: true, isActive: true } } },
    });
    // Same message for unknown email and wrong password — no account enumeration.
    if (!user) throw new ApiError(401, 'Invalid email or password');
    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Invalid email or password');
    if (!user.isActive) throw new ApiError(403, 'This account is deactivated');
    if (user.role !== 'SUPER_ADMIN' && (!user.brand || !user.brand.isActive)) {
      throw new ApiError(403, 'This brand is deactivated');
    }

    const token = await issueSession(user);
    const res = ok({ name: user.name, role: user.role, brandName: user.brand?.name ?? null });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });
    await recordUsage({ userId: user.id, brandId: user.brandId, action: 'LOGIN', req });
    return res;
  } catch (error) {
    return fail(error);
  }
}
