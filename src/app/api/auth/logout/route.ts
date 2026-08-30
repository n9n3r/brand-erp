import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';
import { SESSION_COOKIE, verifySession } from '@/lib/jwt';
import { recordUsage } from '@/lib/logs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Log out even if the session is already invalid — clear the cookie either way.
    const token = cookies().get(SESSION_COOKIE)?.value;
    const session = token ? await verifySession(token) : null;
    if (session) {
      const user = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { brandId: true },
      });
      await recordUsage({
        userId: session.sub,
        brandId: user?.brandId ?? null,
        action: 'LOGOUT',
        req,
      });
    }

    const store = await cookies();
    store.set(SESSION_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
