import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MyBrand — ERP for small brands',
    template: '%s · MyBrand',
  },
  description:
    'Sales, inventory, customers, invoicing, expenses and reports for small brands — plus a super-admin console.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
