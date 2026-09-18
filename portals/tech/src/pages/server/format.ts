import {
  formatDate as adminDate,
  formatDateTime as adminDateTime,
} from '@duncit/app-settings';

/** Shared with the Analytics console, so a size reads the same on both. */
export { formatBytes } from '@duncit/utils';

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

/**
 * Both read the admin's configured patterns (rule 11). They used to render
 * date-fns' locale-long forms ('PPp'/'PP'), which answer to the BROWSER rather
 * than the admin panel — a build timestamp in this portal disagreed with the
 * same timestamp on every other screen.
 */
export function formatDateTime(iso?: string | null): string {
  return adminDateTime(iso) || '—';
}

export function formatDate(iso?: string | null): string {
  return adminDate(iso) || '—';
}
