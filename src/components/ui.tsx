import type { ComponentProps, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Join class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
};

const buttonVariants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
  secondary: 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
};

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

const badgeTones = {
  indigo: 'border-brand-100 bg-brand-50 text-brand-700',
  slate: 'border-slate-200 bg-slate-100 text-slate-600',
  green: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-100 bg-amber-50 text-amber-700',
  red: 'border-red-100 bg-red-50 text-red-700',
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({
  tone = 'slate',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const saleStatus: Record<'PAID' | 'PARTIAL' | 'UNPAID', { tone: BadgeTone; label: string }> = {
  PAID: { tone: 'green', label: 'Paid' },
  PARTIAL: { tone: 'amber', label: 'Partially paid' },
  UNPAID: { tone: 'red', label: 'Unpaid' },
};

export function StatusBadge({ status }: { status: 'PAID' | 'PARTIAL' | 'UNPAID' }) {
  const { tone, label } = saleStatus[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  sub?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-slate-300" /> : null}
      </div>
      <p className="mt-2 truncate text-2xl font-bold text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <Icon className="h-8 w-8 text-slate-300" />
      <p className="mt-3 font-semibold text-slate-800">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

/** Scrollable table container; children are <thead>/<tbody> fragments. */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <table className="min-w-full divide-y divide-slate-200">{children}</table>
    </div>
  );
}
