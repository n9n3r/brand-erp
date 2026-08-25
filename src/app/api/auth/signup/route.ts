import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { hashPassword } from '@/lib/password';
import { signupSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession } from '@/lib/jwt';
import { issueEmailVerification } from '@/lib/email-verification';
import { slugify } from '@/lib/format';

export const runtime = 'nodejs';

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || 'brand';
  let i = 2;
  while (await prisma.brand.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export async function POST(req: NextRequest) {
  try {
    const body = signupSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, 'An account with this email already exists. Try logging in.');

    const brandName = body.brandName.trim();
    const conflictingBrand = await prisma.brand.findUnique({ where: { name: brandName } });
    if (conflictingBrand) throw new ApiError(409, 'A brand with this name already exists. Pick another name.');

    const slug = await uniqueSlug(slugify(brandName));
    const { user, brand } = await prisma.$transaction(async (tx) => {
      const brand = await tx.brand.create({
        data: { name: brandName, slug },
      });
      const user = await tx.user.create({
        data: {
          email,
          name: body.name.trim(),
          passwordHash: await hashPassword(body.password),
          role: 'BRAND_ADMIN',
          brandId: brand.id,
        },
      });
      return { user, brand };
    });

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: 'BRAND_ADMIN',
      brandId: brand.id,
      tv: 0,
    });

    // Send the email-verification link (logged to console when no email
    // provider is configured; the in-app banner offers a resend).
    try {
      await issueEmailVerification({
        userId: user.id,
        email: user.email,
        appUrl: process.env.APP_URL || req.nextUrl.origin,
      });
    } catch (err) {
      console.error('[signup] verification email failed:', err);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });
    await recordUsage({
      userId: user.id,
      brandId: brand.id,
      action: 'SIGNUP',
      detail: `Created brand "${brand.name}"`,
      req,
    });

    const res = ok({ ok: true, role: 'BRAND_ADMIN' }, 201);
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
