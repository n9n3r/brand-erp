import { ok, fail } from '@/lib/api';
import { requireApiUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await requireApiUser();
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        brandId: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        loginCount: true,
      },
    });
    return ok({ user });
  } catch (error) {
    return fail(error);
  }
}
