import { addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/**
 * When a pod's post goes out — pure clock arithmetic, kept apart so it can be
 * tested without a database.
 *
 * The slot is the pod's CALENDAR day in the admin's zone, `daysBefore` days
 * earlier, at `postHour` o'clock in that zone. Counting calendar days rather
 * than 24-hour blocks is what keeps "3 days before a Saturday 7 pm pod at
 * 6 pm" on Wednesday at 6 pm, whatever time of day the pod starts.
 */
const HOUR_MS = 3_600_000;
/** A pod closer than this to its start is not worth a post: nobody can plan for it. */
export const MIN_LEAD_MS = 24 * HOUR_MS;
/** How far ahead a slot is planned: managers get two days to approve. */
export const PLAN_AHEAD_MS = 48 * HOUR_MS;

const pad = (hour: number) => String(hour).padStart(2, '0');

/** `postHour` o'clock on the given zoned calendar day (yyyy-MM-dd), as an instant. */
function atHour(day: string, postHour: number, zone: string): Date {
  return fromZonedTime(`${day}T${pad(postHour)}:00:00`, zone);
}

/** The ideal slot: `daysBefore` calendar days before the pod's day, at `postHour`. */
export function idealSlot(start: Date, daysBefore: number, postHour: number, zone: string): Date {
  const podDay = formatInTimeZone(start, zone, 'yyyy-MM-dd');
  // Noon of the pod's day, shifted by whole days, then read back as a day —
  // noon is never on the wrong side of a daylight-saving jump.
  const shifted = addDays(fromZonedTime(`${podDay}T12:00:00`, zone), -daysBefore);
  return atHour(formatInTimeZone(shifted, zone, 'yyyy-MM-dd'), postHour, zone);
}

/** The first `postHour` o'clock strictly after `now`. */
export function nextSlotAfter(now: Date, postHour: number, zone: string): Date {
  const today = formatInTimeZone(now, zone, 'yyyy-MM-dd');
  const slot = atHour(today, postHour, zone);
  if (slot.getTime() > now.getTime()) return slot;
  const tomorrow = formatInTimeZone(addDays(fromZonedTime(`${today}T12:00:00`, zone), 1), zone, 'yyyy-MM-dd');
  return atHour(tomorrow, postHour, zone);
}

export interface SlotInput {
  start: Date;
  now: Date;
  daysBefore: number;
  postHour: number;
  zone: string;
}

/**
 * The time the post goes out, or null when the pod is too close to promote.
 *
 * A slot already in the past (the pod was published late, or the settings
 * changed) falls to the next `postHour` while the pod is still more than a
 * day away — that next slot is at most 24 h off, so it always lands before
 * the pod starts.
 */
export function postSlot({ start, now, daysBefore, postHour, zone }: SlotInput): Date | null {
  if (start.getTime() - now.getTime() <= MIN_LEAD_MS) return null;
  const ideal = idealSlot(start, daysBefore, postHour, zone);
  if (ideal.getTime() > now.getTime()) return ideal;
  return nextSlotAfter(now, postHour, zone);
}

/** Whether a slot is close enough that the planner should make the promotion now. */
export const dueForPlanning = (slot: Date, now: Date): boolean => slot.getTime() - now.getTime() <= PLAN_AHEAD_MS;
