import { useId } from 'react';
import { cn } from '@/components/ui';

/**
 * MyBrand identity.
 * - LogoMark: the app icon (indigo gradient tile, white "M" monogram,
 *   amber "tag hole" dot) — also used as the favicon via /icon.svg.
 * - Logo: full lockup (mark + wordmark) for headers, sidebars, invoices.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const gid = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="MyBrand logo"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gid})`} />
      <path
        d="M17 45 L17 19 L32 36 L47 19 L47 45"
        fill="none"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="11.5" r="3.2" fill="#fbbf24" />
    </svg>
  );
}

export function Logo({
  size = 32,
  dark = false,
  className,
}: {
  size?: number;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span
        className={cn(
          'text-xl font-extrabold tracking-tight',
          dark ? 'text-white' : 'text-slate-900'
        )}
      >
        My<span className="text-brand-600">Brand</span>
      </span>
    </span>
  );
}
