import { z } from 'zod';
import { strongPasswordSchema, containsPersonalInfo } from '@/lib/password-policy';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z
  .object({
    name: z.string().min(2, 'Your name is required').max(80),
    brandName: z.string().min(2, 'Brand name is required').max(80),
    email: z.string().email('Enter a valid email address'),
    password: strongPasswordSchema,
  })
  .superRefine((data, ctx) => {
    // Password must not contain the user's own email or name.
    if (containsPersonalInfo(data.password, { email: data.email, name: data.name })) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Password must not contain your email address or name.',
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is missing'),
  password: strongPasswordSchema,
});

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(120),
  sku: z.string().max(40).optional().nullable(),
  categoryId: z.string().min(1).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  costPrice: z.number().min(0).optional().nullable(),
  price: z.number().min(0, 'Price must be 0 or more'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  reorderLevel: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(60),
  description: z.string().max(300).optional().nullable(),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(120),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')).nullable(),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
});

export const saleSchema = z.object({
  customerId: z.string().min(1).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100000),
        unitPrice: z.number().min(0),
      })
    )
    .min(1, 'Add at least one product to the sale'),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  amountPaid: z.number().min(0).default(0),
  notes: z.string().max(1000).optional().nullable(),
});

export const paymentSchema = z.object({
  amountPaid: z.number().min(0),
});

export const brandSettingsSchema = z.object({
  name: z.string().min(2, 'Brand name is required').max(80),
  description: z.string().max(300).optional().nullable(),
  currency: z.string().min(3).max(8),
});

export const adminBrandSchema = z.object({
  name: z.string().min(2, 'Brand name is required').max(80),
  description: z.string().max(300).optional().nullable(),
  currency: z.string().min(3).max(8),
});

export const adminBrandUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(300).optional().nullable(),
  currency: z.string().min(3).max(8).optional(),
  isActive: z.boolean().optional(),
});

export const adminUserSchema = z.object({
  name: z.string().min(2, 'Name is required').max(80),
  email: z.string().email('Enter a valid email address'),
  password: strongPasswordSchema,
  role: z.enum(['SUPER_ADMIN', 'BRAND_ADMIN', 'BRAND_USER']),
  brandId: z.string().min(1).optional().nullable(),
});

export const adminUserUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  role: z.enum(['SUPER_ADMIN', 'BRAND_ADMIN', 'BRAND_USER']).optional(),
  brandId: z.string().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
  password: strongPasswordSchema.optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
