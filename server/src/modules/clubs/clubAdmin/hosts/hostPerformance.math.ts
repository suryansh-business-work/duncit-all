import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/**
 * The pure arithmetic of host performance — months, scores, inactivity —
 * with no database, so every boundary is unit-tested on its own.
 *
 * A month is a calendar month on the ADMIN'S clock (Admin > Settings time
 * zone): 1 Nov 00:00 IST is the start of November even though it is still
 * 31 Oct in UTC. A pod counts in the month its START falls in.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM` of the month an instant falls in, in `zone`. */
export function periodOf(at: Date, zone: string): string {
  return formatInTimeZone(at, zone, 'yyyy-MM');
}

/** The day of the month an instant falls on, in `zone` (1-31). */
export function dayOfMonthIn(at: Date, zone: string): number {
  return Number(formatInTimeZone(at, zone, 'd'));
}

const parsePeriod = (period: string): { year: number; month: number } => {
  const [year, month] = period.split('-').map(Number);
  return { year, month };
};

const formatPeriod = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

/** The month `delta` months from `period` (negative goes back). */
export function shiftPeriod(period: string, delta: number): string {
  const { year, month } = parsePeriod(period);
  const index = year * 12 + (month - 1) + delta;
  return formatPeriod(Math.floor(index / 12), (index % 12) + 1);
}

/** `[start, end)` of a month as instants: local midnight on the 1st to the next 1st. */
export function periodRange(period: string, zone: string): { start: Date; end: Date } {
  return {
    start: fromZonedTime(`${period}-01T00:00:00`, zone),
    end: fromZonedTime(`${shiftPeriod(period, 1)}-01T00:00:00`, zone),
  };
}

/** The last `count` months up to and including `period`, oldest first. */
export function recentPeriods(period: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftPeriod(period, i - count + 1));
}

/**
 * Monthly Host Performance Score: the share of the target reached, as a whole
 * percent, capped at 100 — 8 of 8 is 100, 4 of 8 is 50, 10 of 8 is still 100.
 * A target below 1 cannot be configured; it reads as 1 rather than dividing
 * by zero.
 */
export function hostPerformanceScore(completed: number, target: number): number {
  const safeTarget = Math.max(1, Math.floor(target));
  const done = Math.max(0, Math.floor(completed));
  return Math.min(100, Math.round((done / safeTarget) * 100));
}

/** Pods still needed to reach the target (0 once met). */
export function podsShortOfTarget(completed: number, target: number): number {
  return Math.max(0, Math.max(1, Math.floor(target)) - Math.max(0, Math.floor(completed)));
}

/**
 * Inactive: no completed pod within the last `days` days. A host who has never
 * completed one is inactive too — exactly who a club admin should call.
 */
export function isHostInactive(lastPodAt: Date | null | undefined, now: Date, days: number): boolean {
  if (!lastPodAt) return true;
  return now.getTime() - lastPodAt.getTime() > days * DAY_MS;
}

/** Below the admin's threshold (100 = any miss of the target). */
export function isUnderperforming(score: number, thresholdPct: number): boolean {
  return score < thresholdPct;
}
