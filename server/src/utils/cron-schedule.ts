import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * When an admin-configured job is owed a run. Pure, so the awkward cases — a
 * server that was down through the window, a clock that crossed a DST
 * boundary, a weekly run configured for today — are testable without a
 * database or a timer.
 *
 * The configured time is wall-clock time in the platform's own zone (Admin >
 * Settings, default Asia/Kolkata), not the container's UTC. An operator picking
 * 03:00 means the quiet hour their users are asleep through; read as UTC that
 * would land at 08:30 IST, the busiest part of the morning, which is precisely
 * the window a background job must not run in.
 *
 * This lives in utils rather than beside one caller because more than one job
 * now asks the same question — the nightly database backup and the account
 * deletion sweep — and two copies of "is it due" would be two places for the
 * catch-up rule to disagree.
 */
export const DEFAULT_SCHEDULE_ZONE = 'Asia/Kolkata';

const DAY_MS = 86_400_000;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

export interface CronSchedule {
  enabled: boolean;
  frequency: string;
  time_of_day: string;
  weekday: number;
}

export interface TimeOfDay {
  hours: number;
  minutes: number;
}

/** `HH:mm` as numbers, or null when it is not a time this can act on. */
export function parseTimeOfDay(value: string): TimeOfDay | null {
  const match = TIME_PATTERN.exec((value ?? '').trim());
  if (!match) return null;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/** The instant a given zone-local calendar day hits the configured time. */
function occurrenceOn(day: Date, time: TimeOfDay, zone: string): Date {
  const wall = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    time.hours,
    time.minutes,
    0,
    0,
  );
  return fromZonedTime(wall, zone);
}

/** The same zone-local day, `days` earlier. */
function shiftDays(day: Date, days: number): Date {
  return new Date(day.getTime() - days * DAY_MS);
}

/**
 * How many days back the most recent matching weekday is. Zero means today —
 * which may still be in the future, and the caller steps back a week for that.
 */
function daysSinceWeekday(zonedNow: Date, weekday: number): number {
  return (zonedNow.getDay() - weekday + 7) % 7;
}

/**
 * The most recent moment this schedule should have fired, at or before `now`,
 * or null when it is off or misconfigured.
 */
export function lastDueAt(
  schedule: CronSchedule,
  now: Date,
  zone: string = DEFAULT_SCHEDULE_ZONE,
): Date | null {
  if (!schedule.enabled) return null;
  const time = parseTimeOfDay(schedule.time_of_day);
  if (!time) return null;

  const zonedNow = toZonedTime(now, zone);
  const weekly = schedule.frequency === 'WEEKLY';
  const back = weekly ? daysSinceWeekday(zonedNow, schedule.weekday) : 0;
  const candidate = occurrenceOn(shiftDays(zonedNow, back), time, zone);
  if (candidate <= now) return candidate;
  // Today's occurrence has not arrived yet, so the last one was a period ago.
  return occurrenceOn(shiftDays(zonedNow, back + (weekly ? 7 : 1)), time, zone);
}

/** The next moment this schedule will fire, or null when it is off. */
export function nextRunAt(
  schedule: CronSchedule,
  now: Date,
  zone: string = DEFAULT_SCHEDULE_ZONE,
): Date | null {
  const time = parseTimeOfDay(schedule.time_of_day);
  const previous = lastDueAt(schedule, now, zone);
  if (!time || !previous) return null;
  const zonedPrevious = toZonedTime(previous, zone);
  const step = schedule.frequency === 'WEEKLY' ? -7 : -1;
  return occurrenceOn(shiftDays(zonedPrevious, step), time, zone);
}

/**
 * Whether a run is owed: the schedule has passed a firing time that nothing has
 * run since.
 *
 * A server that was down through the window comes back and runs immediately,
 * rather than skipping to tomorrow. That is deliberate — a missed backup is the
 * one you find out about the day you need it, and a late one is still a backup.
 */
export function isDue(
  schedule: CronSchedule,
  lastRunAt: Date | null | undefined,
  now: Date,
  zone: string = DEFAULT_SCHEDULE_ZONE,
): boolean {
  const due = lastDueAt(schedule, now, zone);
  if (!due) return false;
  if (!lastRunAt) return true;
  return lastRunAt < due;
}
