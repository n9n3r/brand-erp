import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fail, ok } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { expenseSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';
import { num } from '@/lib/format';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const { searchParams } = req.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const expenses = await prisma.expense.findMany({
      where: {
        brandId: session.brandId,
        ...(from || to
          ? {
              incurredAt: {
                ...(from ? { gte: new Date(from) } : {}),
                // ⚠️ 'to' is interpreted as UTC here, while /reports uses local time (endOfDay) —
                // inconsistent range boundaries; see ERRORS_AND_SOLUTIONS.md (B-5)
                ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      },
      orderBy: { incurredAt: 'desc' },
      take: 200, // ⚠️ silent cap — older records are not returned and there is no pagination (B-4)
      include: { createdBy: { select: { name: true } } },
    });
    return ok({
      expenses: expenses.map((e) => ({ ...e, amount: num(e.amount) })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const body = expenseSchema.parse(await req.json());
    const expense = await prisma.expense.create({
      data: {
        brandId: session.brandId,
        category: body.category.trim(),
        description: body.description?.trim() || null,
        amount: body.amount,
        incurredAt: body.incurredAt ? new Date(body.incurredAt) : new Date(),
        createdById: session.sub,
      },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'EXPENSE_CREATED',
      detail: `${expense.category} · ${body.amount}`,
      req,
    });
    return ok({ expense: { ...expense, amount: num(expense.amount) } }, 201);
  } catch (error) {
    return fail(error);
  }
}
