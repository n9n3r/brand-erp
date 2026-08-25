import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Canonical usage actions (also powers the admin activity-log filter).
export const USAGE_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'SIGNUP',
  'PASSWORD_RESET',
  'PRODUCT_CREATED',
  'PRODUCT_UPDATED',
  'PRODUCT_DELETED',
  'CATEGORY_CREATED',
  'CATEGORY_UPDATED',
  'CATEGORY_DELETED',
  'CUSTOMER_CREATED',
  'CUSTOMER_UPDATED',
  'CUSTOMER_DELETED',
  'SALE_CREATED',
  'SALE_PAYMENT',
  'SALE_DELIVERY',
  'EXPENSE_CREATED',
  'EXPENSE_UPDATED',
  'EXPENSE_DELETED',
  'STAFF_CREATED',
  'STAFF_UPDATED',
  'USER_DELETED',
  'BRAND_DELETED',
  'BRAND_LOGO_UPDATED',
  'BRAND_SETTINGS_UPDATED',
  'BRAND_CREATED',
  'BRAND_UPDATED',
  'USER_CREATED',
  'USER_UPDATED',
] as const;

export type UsageAction = (typeof USAGE_ACTIONS)[number];

/** Fire-and-forget usage telemetry for the super admin monitoring dashboards. */
export async function recordUsage(opts: {
  userId?: string | null;
  brandId?: string | null;
  action: UsageAction;
  detail?: string;
  req?: NextRequest;
}) {
  try {
    await prisma.usageLog.create({
      data: {
        userId: opts.userId ?? null,
        brandId: opts.brandId ?? null,
        action: opts.action,
        detail: opts.detail,
        ip: opts.req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: opts.req?.headers.get('user-agent') || null,
      },
    });
  } catch (err) {
    console.error('[usage] failed to record:', err);
  }
}
