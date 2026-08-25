/**
 * MyBrand seed: super admin + a fully-loaded demo brand
 * ("Amaka Skincare") with categories, products, customers, 6 weeks of sales
 * and usage history. Safe to re-run (it wipes & rebuilds the demo brand).
 *
 *   npm run db:seed
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// Deterministic RNG so the demo data is stable across runs.
let seedState = 1337;
function rand() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const rint = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const r2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'Admin123!';

  // 1) Super admin (upsert — safe to re-run)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@erpdemo.app' },
    update: {},
    create: {
      email: 'admin@erpdemo.app',
      name: 'Platform Admin',
      passwordHash: await hash(superAdminPassword, 10),
      role: 'SUPER_ADMIN',
      emailVerifiedAt: new Date(),
    },
  });

  // 2) Demo brand — wipe existing demo data first for idempotency.
  await prisma.brand.deleteMany({ where: { slug: 'amaka-skincare' } });

  const brand = await prisma.brand.create({
    data: {
      name: 'Amaka Skincare',
      slug: 'amaka-skincare',
      description: 'Handmade skincare from Lagos, Nigeria',
      currency: 'NGN',
    },
  });

  const demoAdmin = await prisma.user.create({
    data: {
      email: 'demo@erpdemo.app',
      name: 'Amaka Okonkwo',
      passwordHash: await hash('Demo123!', 10),
      role: 'BRAND_ADMIN',
      brandId: brand.id,
      emailVerifiedAt: new Date(),
    },
  });
  const demoStaff = await prisma.user.create({
    data: {
      email: 'staff@erpdemo.app',
      name: 'Tunde Bakare',
      passwordHash: await hash('Demo123!', 10),
      role: 'BRAND_USER',
      brandId: brand.id,
      emailVerifiedAt: new Date(),
    },
  });

  // 3) Categories (manually managed by the brand)
  const categoryData: Array<[string, string]> = [
    ['Cleansers', 'Face wash, toners and cleansers'],
    ['Moisturizers', 'Creams, lotions and butters'],
    ['Serums', 'Treatment serums and oils'],
    ['Masks', 'Clay and sheet masks'],
  ];
  const categoryIds: Record<string, string> = {};
  for (const [name, description] of categoryData) {
    const c = await prisma.category.create({ data: { brandId: brand.id, name, description } });
    categoryIds[name] = c.id;
  }

  // 4) Products: [name, category, price, cost, qty, reorderLevel]
  const productData: Array<[string, string, number, number, number, number]> = [
    ['Glow Cleansing Gel', 'Cleansers', 6500, 2800, 42, 10],
    ['Rose Water Toner', 'Cleansers', 5200, 2100, 8, 10],
    ['Gentle Foam Wash', 'Cleansers', 5900, 2400, 30, 8],
    ['Shea Whip Body Cream', 'Moisturizers', 8900, 3600, 28, 8],
    ['Aloe Day Moisturizer', 'Moisturizers', 9800, 4100, 22, 8],
    ['Cocoa Body Butter', 'Moisturizers', 10500, 4400, 16, 6],
    ['Vitamin C Face Serum', 'Serums', 14500, 6200, 19, 6],
    ['Hydrating Hyaluron Serum', 'Serums', 12500, 5100, 4, 6],
    ['Overnight Repair Oil', 'Serums', 11000, 4300, 24, 6],
    ['Niacinamide 10% Serum', 'Serums', 13200, 5500, 1, 5],
    ['Charcoal Clay Mask', 'Masks', 7500, 3000, 35, 8],
    ['Brightening Sheet Mask (5pk)', 'Masks', 9000, 3900, 3, 6],
  ];
  const products: { id: string; name: string; price: number }[] = [];
  for (let i = 0; i < productData.length; i++) {
    const [name, cat, price, cost, qty, reorder] = productData[i];
    const p = await prisma.product.create({
      data: {
        brandId: brand.id,
        categoryId: categoryIds[cat],
        name,
        sku: `AMK-${100 + i}`,
        price,
        costPrice: cost,
        quantity: qty,
        reorderLevel: reorder,
      },
    });
    products.push({ id: p.id, name: p.name, price });
  }

  // 5) Customers
  const customerData = [
    ['Chidinma Eze', 'chidinma.eze@example.com', '+234 803 111 2233', '12 Herbert Macaulay Way, Yaba, Lagos'],
    ['Ngozi Okafor', 'ngozi.okafor@example.com', '+234 805 222 3344', '4 Bode Thomas St, Surulere, Lagos'],
    ['Segun Adeyemi', 'segun.adeyemi@example.com', '+234 802 333 4455', 'Adeniran Ogunsanya, Surulere, Lagos'],
    ['Fatima Bello', 'fatima.bello@example.com', '+234 806 444 5566', 'Ahmadu Bello Way, Kaduna'],
    ['Emeka Nwosu', 'emeka.nwosu@example.com', '+234 807 555 6677', '6 Works Rd, GRA Enugu'],
    ['Aisha Mohammed', 'aisha.mohammed@example.com', '+234 809 666 7788', 'Wuse II, Abuja'],
  ];
  const customers: { id: string }[] = [];
  for (const [name, email, phone, address] of customerData) {
    const c = await prisma.customer.create({
      data: { brandId: brand.id, name, email, phone, address },
    });
    customers.push({ id: c.id });
  }

  // 6) Six weeks of sales history
  const year = new Date().getFullYear();
  let seq = 0;
  for (let d = 45; d >= 0; d--) {
    if (rand() < 0.35) continue; // some days with no sales
    const salesToday = rint(1, 3);
    for (let s = 0; s < salesToday; s++) {
      seq++;
      const chosen = [...products].sort(() => rand() - 0.5).slice(0, rint(1, 3));
      const items = chosen.map((p) => {
        const quantity = rint(1, 3);
        return {
          productId: p.id,
          productName: p.name,
          quantity,
          unitPrice: p.price,
          lineTotal: r2(p.price * quantity),
        };
      });
      const subtotal = r2(items.reduce((sum, i) => sum + i.lineTotal, 0));
      const roll = rand();
      const amountPaid = roll < 0.75 ? subtotal : roll < 0.9 ? r2(subtotal / 2) : 0;
      const status = amountPaid >= subtotal ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'UNPAID';
      const soldAt = new Date(Date.now() - d * 86400000);
      soldAt.setHours(rint(9, 19), rint(0, 59), rint(0, 59));
      await prisma.sale.create({
        data: {
          brandId: brand.id,
          invoiceNumber: `INV-${year}-${String(seq).padStart(5, '0')}`,
          customerId: rand() < 0.7 ? pick(customers).id : null,
          soldById: rand() < 0.7 ? demoAdmin.id : demoStaff.id,
          status,
          subtotal,
          discount: 0,
          tax: 0,
          total: subtotal,
          amountPaid,
          soldAt,
          items: { create: items },
        },
      });
    }
  }
  await prisma.brand.update({ where: { id: brand.id }, data: { invoiceSeq: seq } });

  // 7b) Expenses history
  const expenseData: Array<[string, number, number]> = [
    ['Stock purchase', 185000, 40],
    ['Marketing & ads', 45000, 34],
    ['Transport & delivery', 28000, 30],
    ['Rent', 120000, 25],
    ['Packaging', 36000, 20],
    ['Salaries', 95000, 15],
    ['Bank charges', 4500, 10],
    ['Equipment', 65000, 6],
    ['Stock purchase', 72000, 3],
    ['Marketing & ads', 30000, 1],
  ];
  for (const [category, amount, daysAgo] of expenseData) {
    const at = new Date(Date.now() - daysAgo * 86400000);
    at.setHours(rint(10, 16), rint(0, 59));
    await prisma.expense.create({
      data: { brandId: brand.id, category, amount, incurredAt: at, createdById: demoAdmin.id },
    });
  }

  // 7) Login/usage history for the monitoring dashboards
  const staff = [demoAdmin, demoStaff, superAdmin];
  for (let d = 13; d >= 0; d--) {
    for (const u of staff) {
      if (u.role === 'SUPER_ADMIN' ? rand() < 0.35 : rand() < 0.7) {
        const at = new Date(Date.now() - d * 86400000);
        at.setHours(rint(8, 18), rint(0, 59));
        await prisma.usageLog.create({
          data: { userId: u.id, brandId: u.brandId, action: 'LOGIN', createdAt: at },
        });
      }
    }
  }
  await prisma.usageLog.create({
    data: {
      userId: superAdmin.id,
      action: 'BRAND_CREATED',
      detail: 'Amaka Skincare',
      createdAt: new Date(Date.now() - 46 * 86400000),
    },
  });

  await prisma.user.update({
    where: { id: demoAdmin.id },
    data: { lastLoginAt: new Date(), loginCount: rint(40, 90) },
  });
  await prisma.user.update({
    where: { id: demoStaff.id },
    data: { lastLoginAt: new Date(Date.now() - 86400000), loginCount: rint(15, 40) },
  });

  console.log('──────────────────────────────────────────────────');
  console.log('Seed complete. Test accounts:');
  console.log('  SUPER ADMIN  admin@erpdemo.app  /  ' + superAdminPassword);
  console.log('  BRAND ADMIN  demo@erpdemo.app   /  Demo123!');
  console.log('  BRAND STAFF  staff@erpdemo.app /  Demo123!');
  console.log(`  Demo brand: Amaka Skincare (${seq} invoices)`);
  console.log('──────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
