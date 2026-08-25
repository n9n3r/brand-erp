import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api';
import { recordUsage } from '@/lib/logs';
import { SESSION_COOKIE } from '@/lib/jwt';
import { getApiSession } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession();
    if (session) {
      await recordUsage({ userId: session.sub, brandId: session.brandId, action: 'LOGOUT', req });
    }
    const res = ok({ ok: true });
    res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
    return res;
  } catch (error) {
    return fail(error);
  }
}
