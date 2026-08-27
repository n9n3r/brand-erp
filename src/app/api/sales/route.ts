import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, ApiError } from '@/lib/api';
import { requireApiBrandUser } from '@/lib/api-auth';
import { saleSchema } from '@/lib/validation';
import { recordUsage } from '@/lib/logs';
import { num, r2 } from '@/lib/format';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const sales = await prisma.sale.findMany({
      where: { brandId: session.brandId },
      orderBy: { soldAt: 'desc' },
      take: 50,
      include: {
        customer: { select: { name: true } },
        _count: { select: { items: true } },
      },
    });
    return ok({
      sales: sales.map((s) => ({
        ...s,
        subtotal: num(s.subtotal),
        discount: num(s.discount),
        tax: num(s.tax),
        total: num(s.total),
        amountPaid: num(s.amountPaid),
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Record a sale (POS). One transaction: stock check → decrement →
 * per-brand invoice counter (INV-YYYY-NNNNN) → Sale + line-item snapshots.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireApiBrandUser();
    const body = saleSchema.parse(await req.json());

    const sale = await prisma.$transaction(async (tx) => {
      const brand = await tx.brand.findUnique({ where: { id: session.brandId } });
      if (!brand || !brand.isActive) throw new ApiError(403, 'This brand is deactivated');

      if (body.customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: body.customerId, brandId: session.brandId },
        });
        if (!customer) throw new ApiError(400, 'Customer not found');
      }

      // Aggregate quantities per product (the client may send a product twice).
      const wanted = new Map<string, number>();
      for (const item of body.items) {
        wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
      }

      const products = await tx.product.findMany({
        where: { id: { in: [...wanted.keys()] }, brandId: session.brandId },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      for (const [productId, quantity] of wanted) {
        const p = byId.get(productId);
        if (!p) throw new ApiError(400, 'One of the selected products no longer exists');
        if (!p.isActive) throw new ApiError(400, `"${p.name}" is archived — enable it before selling`);
        if (p.quantity < quantity) {
          throw new ApiError(400, `Insufficient stock for "${p.name}" — ${p.quantity} available`);
        }
      }

      const subtotal = r2(body.items.reduce((s, i) => s + r2(i.unitPrice * i.quantity), 0));
      const total = r2(subtotal - body.discount + body.tax);
      const amountPaid = r2(Math.min(body.amountPaid, total));
      const status = amountPaid >= total - 0.001 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'UNPAID';
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(brand.invoiceSeq + 1).padStart(5, '0')}`;

      const created = await tx.sale.create({
        data: {
          brandId: session.brandId,
          invoiceNumber,
          customerId: body.customerId ?? null,
          soldById: session.sub,
          status,
          subtotal,
          discount: body.discount,
          tax: body.tax,
          total,
          amountPaid,
          notes: body.notes?.trim() || null,
          items: {
            create: body.items.map((i) => ({
              productId: i.productId,
              // Snapshots: invoices keep name/price even if the product is later edited or deleted.
              productName: byId.get(i.productId)!.name,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              lineTotal: r2(i.unitPrice * i.quantity),
            })),
          },
        },
      });

      for (const [productId, quantity] of wanted) {
        await tx.product.update({
          where: { id: productId },
          data: { quantity: { decrement: quantity } },
        });
      }
      await tx.brand.update({
        where: { id: brand.id },
        data: { invoiceSeq: { increment: 1 } },
      });

      return created;
    });

    await recordUsage({
      userId: session.sub,
      brandId: session.brandId,
      action: 'SALE_CREATED',
      detail: `${sale.invoiceNumber} · ${num(sale.total)}`,
      req,
    });
    return ok(
      {
        sale: {
          ...sale,
          subtotal: num(sale.subtotal),
          discount: num(sale.discount),
          tax: num(sale.tax),
          total: num(sale.total),
          amountPaid: num(sale.amountPaid),
        },
      },
      201,
    );
  } catch (error) {
    return fail(error);
  }
}
