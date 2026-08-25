// Edge-safe JWT session helpers (no node-only APIs, no next/headers).
// Used by both middleware (edge runtime) and server code (node runtime).
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'brandos_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type Role = 'SUPER_ADMIN' | 'BRAND_ADMIN' | 'BRAND_USER';

export type SessionPayload = {
  sub: string; // user id
  email: string;
  name: string;
  role: Role;
  brandId: string | null;
  /** Token version at issue time — bumped on password reset/change so old
   *  JWTs become invalid even before their 7-day expiry. Missing = 0. */
  tv?: number;
};

function secretKey() {
  const secret = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setSubject(payload.sub)
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || !payload.role) return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
