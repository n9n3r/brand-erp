import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'mb_session';
const ALG = 'HS256' as const;
const EXPIRES_IN = '7d';

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me');
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  // Loud, but not fatal: an unset JWT_SECRET in production breaks session
  // continuity between instances that were started with different secrets.
  console.warn('[jwt] JWT_SECRET is not set — falling back to an insecure dev secret.');
}

export type Session = {
  sub: string; // user id
  role: 'SUPER_ADMIN' | 'BRAND_ADMIN' | 'BRAND_USER';
  brandId: string | null;
  tv: number; // tokenVersion at sign-in time
};

export async function issueSession(user: {
  id: string;
  role: Session['role'];
  brandId: string | null;
  tokenVersion: number;
}): Promise<string> {
  return new SignJWT({ role: user.role, brandId: user.brandId, tv: user.tokenVersion })
    .setProtectedHeader({ alg: ALG })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(secret);
}

/** Edge-safe verification (used by middleware). Returns null for any invalid/expired token. */
export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      role: payload.role as Session['role'],
      brandId: (payload.brandId as string | null) ?? null,
      tv: typeof payload.tv === 'number' ? payload.tv : 0,
    };
  } catch {
    return null;
  }
}
