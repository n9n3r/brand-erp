'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui';

/** Triggers the browser print dialog; hidden from the printed output itself. */
export function PrintButton() {
  return (
    <Button variant="secondary" className="no-print" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Print / Save PDF
    </Button>
  );
}
