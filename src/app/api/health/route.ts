import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Liveness probe: app + database reachable. Useful after sandbox resumes. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      app: 'MyBrand ERP',
      db: 'up',
      time: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: 'degraded', app: 'MyBrand ERP', db: 'down' },
      { status: 503 }
    );
  }
}
