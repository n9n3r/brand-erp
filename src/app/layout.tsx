import type { Metadata } from 'next';
// The stylesheet is handled by Next.js; TypeScript may not have CSS module declarations.
// @ts-expect-error Next.js processes this global stylesheet at build time.
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MyBrand — The simple ERP for small brands',
    template: '%s · MyBrand',
  },
  description:
    'Track sales, manage inventory, keep customers, issue invoices and see reports — a lightweight ERP built for small brands.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
