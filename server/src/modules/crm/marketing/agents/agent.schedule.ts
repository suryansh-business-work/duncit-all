import { addDays } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { getAppTimeZone } from '@utils/app-time';
import type { AgentSchedule } from './agent.catalog';

const DAYS_IN_WEEK = 7;

/**
 * The next instant a schedule fires strictly after `from`, read on the
 * admin's clock (Admin › Settings › time zone, the same zone every printed
 * time uses) so "9 in the morning" means the marketer's morning, not UTC's.
 *
 * DAY: today at `hour` if that is still ahead, else tomorrow. WEEK: the next
 * `weekday` at `hour`, a full week away when that weekday is today and the
 * hour has passed.
 */
export function nextRunAt(schedule: AgentSchedule, from: Date, zone: string = getAppTimeZone()): Date {
  const local = toZonedTime(from, zone);
  let candidate = new Date(local);
  candidate.setHours(schedule.hour, 0, 0, 0);
  if (schedule.every === 'WEEK') {
    candidate = addDays(candidate, (schedule.weekday - candidate.getDay() + DAYS_IN_WEEK) % DAYS_IN_WEEK);
  }
  if (candidate.getTime() <= local.getTime()) {
    candidate = addDays(candidate, schedule.every === 'WEEK' ? DAYS_IN_WEEK : 1);
  }
  return fromZonedTime(candidate, zone);
}
