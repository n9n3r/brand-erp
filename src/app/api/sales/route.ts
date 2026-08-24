import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, fail, ok } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { saleSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';
import { r2 } from '@/lib/format';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const take = Math.min(Number(searchParams.get('take') ?? 50), 100);

    const sales = await prisma.sale.findMany({
      where: {
        brandId: session.brandId,
        ...(status && ['PAID', 'PARTIAL', 'UNPAID'].includes(status) ? { status: status as 'PAID' | 'PARTIAL' | 'UNPAID' } : {}),
      },
      orderBy: { soldAt: 'desc' },
      take,
      include: { customer: { select: { name: true } }, _count: { select: { items: true } } },
    });
    return ok({ sales });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const body = saleSchema.parse(await req.json());

    if (body.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: body.customerId, brandId: session.brandId },
      });
      if (!customer) throw new ApiError(400, 'Customer not found');
    }

    const sale = await prisma.$transaction(async (tx) => {
      type Line = { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number };
      const lines: Line[] = [];
      let subtotal = 0;

      for (const item of body.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.brandId !== session.brandId || !product.isActive) {
          throw new ApiError(400, `A selected product is unavailable. Refresh and try again.`);
        }
        if (product.quantity < item.quantity) {
          throw new ApiError(400, `Insufficient stock for "${product.name}" — ${product.quantity} available`);
        }
        const unitPrice = r2(item.unitPrice);
        const lineTotal = r2(unitPrice * item.quantity);
        subtotal = r2(subtotal + lineTotal);
        lines.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
        });
      }

      const discount = r2(body.discount);
      const tax = r2(body.tax);
      const total = r2(Math.max(0, subtotal - discount + tax));
      const amountPaid = r2(Math.min(body.amountPaid, total));
      const status = amountPaid >= total - 0.001 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'UNPAID';

      const year = new Date().getFullYear();
      const brand = await tx.brand.update({
        where: { id: session.brandId },
        data: { invoiceSeq: { increment: 1 } },
        select: { invoiceSeq: true, currency: true },
      });
      const invoiceNumber = `INV-${year}-${String(brand.invoiceSeq).padStart(5, '0')}`;

      const created = await tx.sale.create({
        data: {
          brandId: session.brandId,
          invoiceNumber,
          customerId: body.customerId ?? null,
          soldById: session.sub,
          status,
          subtotal,
          discount,
          tax,
          total,
          amountPaid,
          notes: body.notes ?? null,
          items: { create: lines },
        },
      });

      for (const line of lines) {
        await tx.product.update({
          where: { id: line.productId },
          data: { quantity: { decrement: line.quantity } },
        });
      }
      return created;
    });

    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'SALE_CREATED',
      detail: `${sale.invoiceNumber} · ${sale.total}`,
      req,
    });

    return ok({ id: sale.id, invoiceNumber: sale.invoiceNumber }, 201);
  } catch (error) {
    return fail(error);
  }
}
