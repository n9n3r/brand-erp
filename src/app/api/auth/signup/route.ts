import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, ApiError } from '@/lib/api';
import { signupSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/password';
import { SESSION_COOKIE, issueSession } from '@/lib/jwt';
import { recordUsage } from '@/lib/logs';
import { slugify } from '@/lib/format';
import { issueVerificationToken } from '@/lib/email-verification';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = signupSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new ApiError(409, 'An account with this email already exists');

    // Brand names are globally unique; derive a unique slug.
    const baseSlug = slugify(body.brandName) || 'brand';
    let slug = baseSlug;
    for (let i = 2; await prisma.brand.findUnique({ where: { slug } }); i++) {
      slug = `${baseSlug}-${i}`;
    }
    const existingBrand = await prisma.brand.findUnique({ where: { name: body.brandName.trim() } });
    if (existingBrand) throw new ApiError(409, 'A brand with that name already exists');

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email,
        name: body.name.trim(),
        passwordHash,
        role: 'BRAND_ADMIN',
        brand: {
          create: {
            name: body.brandName.trim(),
            slug,
            currency: 'NGN',
          },
        },
      },
      select: { id: true, email: true, name: true, role: true, brandId: true, tokenVersion: true, brand: { select: { id: true, name: true } } },
    });
    if (!user.brandId) throw new ApiError(500, 'Failed to create brand workspace');

    await issueVerificationToken(user);

    const token = await issueSession(user);
    const res = ok({ name: user.name, role: user.role, brandName: user.brand?.name ?? null });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    await recordUsage({ userId: user.id, brandId: user.brandId, action: 'SIGNUP', req });
    return res;
  } catch (error) {
    return fail(error);
  }
}
