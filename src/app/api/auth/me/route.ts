import { fail, ok } from '@/lib/api';
import { requireApiUser } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await requireApiUser();
    return ok({
      user: {
        id: session.sub,
        email: session.email,
        name: session.name,
        role: session.role,
        brandId: session.brandId,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
