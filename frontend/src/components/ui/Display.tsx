import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Star, WarningCircle, CheckCircle, House } from '@phosphor-icons/react';

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div
    className={`rounded-xl border border-line bg-surface ${className}`}
  >
    {children}
  </div>
);

export function Banner({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  const isError = tone === 'error';
  const Icon = isError ? WarningCircle : CheckCircle;
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
        isError ? 'border-bad/30 bg-bad/10 text-bad' : 'border-ok/30 bg-ok/10 text-ok'
      }`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// One status vocabulary for Profile, Booking and Admin.
const STATUS: Record<string, { label: string; cls: string }> = {
  RESERVED:         { label: 'Reserved',        cls: 'bg-accent/10 text-accent' },
  GUESTS_ADDED:     { label: 'Guests added',    cls: 'bg-accent/10 text-accent' },
  PAYMENTS_PENDING: { label: 'Payment pending', cls: 'bg-accent/10 text-accent' },
  CONFIRMED:        { label: 'Confirmed',       cls: 'bg-ok/15 text-ok' },
  CANCELLED:        { label: 'Cancelled',       cls: 'bg-bad/15 text-bad' },
  EXPIRED:          { label: 'Expired',         cls: 'bg-ink-faint/20 text-ink-muted' },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: 'bg-ink-faint/20 text-ink-muted' };
  return <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  if (!value || value <= 0) return null;
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${value} star hotel`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          weight={i < value ? 'fill' : 'regular'}
          className={i < value ? 'text-star' : 'text-line'}
        />
      ))}
    </div>
  );
}

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />
);

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-20 px-6">
      <div className="grid h-14 w-14 place-items-center rounded-lg bg-surface-2 text-ink-muted">{icon}</div>
      <h3 className="mt-5 text-xl text-ink">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Logo({ to = '/', className = '' }: { to?: string; className?: string }) {
  return (
    <Link to={to} aria-label="QuickStay home" className={`inline-flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight ${className}`}>
      <House size={26} weight="fill" />
      QuickStay
    </Link>
  );
}
