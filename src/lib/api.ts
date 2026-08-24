import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data as unknown as Record<string, unknown>, { status });
}

export function fail(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message || 'Invalid request data';
    return NextResponse.json({ error: message }, { status: 400 });
  }
  console.error('[api] Unhandled error:', error);
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}
