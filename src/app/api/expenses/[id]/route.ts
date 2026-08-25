import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { expenseSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';
import { num } from '@/lib/format';

export const runtime = 'nodejs';

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const body = expenseSchema.parse(await req.json());
    const existing = await prisma.expense.findFirst({
      where: { id: params.id, brandId: session.brandId },
    });
    if (!existing) throw new ApiError(404, 'Expense not found');

    const expense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        category: body.category.trim(),
        description: body.description?.trim() || null,
        amount: body.amount,
        incurredAt: body.incurredAt ? new Date(body.incurredAt) : existing.incurredAt,
      },
    });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'EXPENSE_UPDATED',
      detail: `${expense.category} · ${body.amount}`,
      req,
    });
    return ok({ expense: { ...expense, amount: num(expense.amount) } });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiBrandUser();
    const existing = await prisma.expense.findFirst({
      where: { id: params.id, brandId: session.brandId },
    });
    if (!existing) throw new ApiError(404, 'Expense not found');
    await prisma.expense.delete({ where: { id: params.id } });
    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'EXPENSE_DELETED',
      detail: `${existing.category} · ${num(existing.amount)}`,
      req,
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
