import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/** Business-rule error with an HTTP status. Thrown inside route handlers. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Central error → JSON mapping: ApiError, Zod (400), Prisma P2002 (409) / P2025 (404), else 500. */
export function fail(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A record with that value already exists' }, { status: 409 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
  }
  console.error('[api] unhandled error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
