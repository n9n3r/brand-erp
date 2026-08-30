'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui';

function escapeCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Client-side CSV export (Blob download — no server round trip). */
export function CsvButton({
  headers,
  rows,
  filename,
  label,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
  filename: string;
  label: string;
}) {
  function download() {
    const csv = [headers, ...rows].map((r) => r.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="secondary" onClick={download}>
      <Download className="h-4 w-4" /> {label}
    </Button>
  );
}
