import type { Metadata } from 'next';
import { requireBrandSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays, num, startOfDay, startOfMonth } from '@/lib/format';
import { ExpensesClient } from './expenses-client';

export const metadata: Metadata = { title: 'Expenses' };

export type ExpenseRow = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  incurredAt: string; // ISO
  createdByName: string | null;
};

export default async function ExpensesPage() {
  const session = await requireBrandSession();
  const [brand, expenses] = await Promise.all([
    prisma.brand.findUnique({ where: { id: session.brandId }, select: { currency: true } }),
    prisma.expense.findMany({
      where: { brandId: session.brandId },
      orderBy: { incurredAt: 'desc' },
      take: 200,
      include: { createdBy: { select: { name: true } } },
    }),
  ]);

  const rows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    category: e.category,
    description: e.description,
    amount: num(e.amount),
    incurredAt: e.incurredAt.toISOString(),
    createdByName: e.createdBy?.name ?? null,
  }));

  const now = new Date();
  const monthStart = startOfMonth(now);
  const days30 = startOfDay(addDays(now, -29));
  const totalAll = rows.reduce((s, r) => s + r.amount, 0);
  const total30 = rows.filter((r) => new Date(r.incurredAt) >= days30).reduce((s, r) => s + r.amount, 0);
  const totalMonth = rows.filter((r) => new Date(r.incurredAt) >= monthStart).reduce((s, r) => s + r.amount, 0);

  return (
    <ExpensesClient
      expenses={rows}
      currency={brand?.currency ?? 'NGN'}
      totals={{ all: totalAll, last30: total30, thisMonth: totalMonth }}
    />
  );
}
