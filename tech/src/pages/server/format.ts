import { format, isValid, parseISO } from 'date-fns';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** Human-readable bytes, e.g. 8589934592 -> "8 GB". */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const i = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  const digits = i === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
  // toFixed then parseFloat drops trailing zeros (8.00 -> 8, 0.090 -> 0.09).
  return `${parseFloat(value.toFixed(digits))} ${UNITS[i]}`;
}

/** Compact uptime, e.g. 7081200 -> "81d 22h". */
export function formatUptime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes && !days) parts.push(`${minutes}m`);
  return parts.join(' ') || '<1m';
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'PPp') : '—';
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'PP') : '—';
}
