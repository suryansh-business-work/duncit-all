import type { DateInput } from '@duncit/datetime';

import { appFormatter, appNow } from '@/utils/app-formatter';

const toDate = (input: string | null | undefined): Date | null => {
  if (!input) return null;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Date label in the admin's format + zone, e.g. "07 Jun 2026". Empty when
 * unparseable. Driven by Admin > Settings, identical to mWeb (rule 11). */
export function formatDate(input: DateInput): string {
  return appFormatter().formatDate(input);
}

/** Date+time label in the admin's format + zone, e.g. "07 Jun 2026, 06:30 PM".
 * Empty when unparseable. */
export function formatDateTime(input: DateInput): string {
  return appFormatter().formatDateTime(input);
}

/** Time label in the admin's format + zone, e.g. "06:30 PM". Empty when
 * unparseable. Mirrors mWeb's `formatTime` (rule 27). */
export function formatTime(input: DateInput): string {
  return appFormatter().formatTime(input);
}

/** A stored 'yyyy-MM-dd' calendar day in the admin's date format — never
 * shifted by a time zone, because a calendar day is not an instant. */
export function formatDay(value: string): string {
  return appFormatter().formatDay(value);
}

/** "X remaining" until a status auto-expires; null when unknown/expired —
 * mirrors mWeb's statusRemainingLabel so both viewers read identically.
 * Defaults to the APPLICATION clock, so a custom admin time moves it too. */
export function statusRemainingLabel(
  expiresAt: string | null | undefined,
  now: Date = appNow(),
): string | null {
  const expiry = toDate(expiresAt);
  if (!expiry || expiry.getTime() <= now.getTime()) return null;
  const minutes = Math.ceil((expiry.getTime() - now.getTime()) / 60000);
  if (minutes < 60) return `${minutes}m remaining`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h remaining`;
  return `${Math.floor(hours / 24)}d remaining`;
}

/** Compact "time since" label (now / 5m / 3h / 2d) — RN port of mWeb's
 * formatRelative, measured against the application clock. */
export function formatRelative(iso: string): string {
  const diff = appNow().getTime() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/** Human duration between two dates — one rule shared with mWeb. */
export { formatDurationBetween } from '@duncit/datetime';
