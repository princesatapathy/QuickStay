export const fmtDate = (d?: string, withYear = true) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        ...(withYear ? { year: 'numeric' } : {}),
      })
    : '';

export const nights = (a?: string, b?: string) =>
  a && b ? Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000)) : 1;

export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
