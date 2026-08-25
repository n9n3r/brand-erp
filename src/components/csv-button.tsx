'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui';

function csvEscape(value: string | number): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function CsvButton({
  headers,
  rows,
  filename,
  label = 'Export CSV',
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
  filename: string;
  label?: string;
}) {
  function download() {
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return (
    <Button variant="secondary" onClick={download}>
      <Download className="h-4 w-4" /> {label}
    </Button>
  );
}
