/** Shared formatting for the pod-details sections. */
export const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const money = (sym: string, value?: number | null) => `${sym}${(value ?? 0).toLocaleString()}`;
