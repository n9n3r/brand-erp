import { cn } from '@/components/ui';

/** MyBrand mark — the rounded indigo tile with the “M” stroke. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="12" fill="#4f46e5" />
      <path
        d="M12 33V15l8 10 4-6 4 6 8-10v18"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Mark + wordmark. */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} />
      <span className="text-lg font-bold tracking-tight text-slate-900">MyBrand</span>
    </span>
  );
}
