import { addDays, format, isAfter, set as setTimeOnDate, startOfDay } from 'date-fns';
import { wholeDayWindow } from '../slot-window';
import { effectiveMaxAdvance, parseHHMM } from './settings-map';
import type {
  GenerateResult,
  PreviewSummary,
  RecurringConfig,
  RecurringErrorCode,
  TimeRange,
  VenueSettingsLike,
} from './types';

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (hhmm: string): number => {
  const { hours, minutes } = parseHHMM(hhmm);
  return hours * 60 + minutes;
};

const combine = (date: Date, hhmm: string): Date => {
  const { hours, minutes } = parseHHMM(hhmm);
  return setTimeOnDate(date, { hours, minutes, seconds: 0, milliseconds: 0 });
};

const emptySummary = (): PreviewSummary => ({
  total: 0,
  bySpace: {},
  estimatedRevenue: 0,
  skippedWeeklyOff: 0,
  skippedHolidays: 0,
  skippedPast: 0,
  skippedBeyondCap: 0,
});

/** Validates the time ranges against the venue hours and each other: each must be
 * a valid, in-order window inside operating hours, and adjacent ranges must keep
 * at least the venue's buffer gap (never overlap). */
function timeSlotErrors(config: RecurringConfig, settings: VenueSettingsLike): RecurringErrorCode[] {
  const errors: RecurringErrorCode[] = [];
  if (config.timeSlots.length === 0) {
    errors.push('addTimeSlot');
    return errors;
  }
  const { open, close } = settings.operating_hours;
  for (const t of config.timeSlots) {
    if (!HHMM_RE.test(t.start) || !HHMM_RE.test(t.end)) {
      errors.push('invalidTime');
      return errors;
    }
    if (toMinutes(t.end) <= toMinutes(t.start)) {
      errors.push('endAfterStart');
    }
    if (HHMM_RE.test(open) && toMinutes(t.start) < toMinutes(open)) {
      errors.push('beforeOpen');
    }
    if (HHMM_RE.test(close) && toMinutes(t.end) > toMinutes(close)) {
      errors.push('afterClose');
    }
  }
  errors.push(...gapErrors(config.timeSlots, Math.max(0, Math.round(config.bufferMinutes))));
  return errors;
}

/** Overlap + minimum-gap check across the sorted ranges. */
function gapErrors(slots: TimeRange[], buffer: number): RecurringErrorCode[] {
  const sorted = [...slots].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  let previous: TimeRange | undefined;
  for (const current of sorted) {
    if (previous) {
      const gap = toMinutes(current.start) - toMinutes(previous.end);
      if (gap < 0) return ['overlap'];
      if (buffer > 0 && gap < buffer) return ['bufferGap'];
    }
    previous = current;
  }
  return [];
}

/** Validates the config against itself + venue operating hours, returning the
 * codes of everything wrong with it (empty when valid). */
function collectErrors(config: RecurringConfig, settings: VenueSettingsLike): RecurringErrorCode[] {
  const errors: RecurringErrorCode[] = [];
  if (!config.startDate || !config.endDate) errors.push('pickDates');
  if (config.startDate && config.endDate && config.endDate < startOfDay(config.startDate)) {
    errors.push('endDateAfterStart');
  }
  if (config.weekdays.length === 0) errors.push('pickWeekday');
  // Whole-day mode books the entire date, so the daily time windows (and the
  // operating-hours checks that govern them) don't apply.
  if (!config.wholeDay) errors.push(...timeSlotErrors(config, settings));
  if (config.spaces.length === 0) errors.push('addSpace');
  if (config.spaces.some((s) => s.price < 0)) errors.push('negativePrice');
  return errors;
}

/** The pure heart of Recurring Availability. Walks every day in the range, keeps
 * the selected weekdays, skips weekly-offs/holidays/past/beyond-cap, and creates
 * one slot per time range per space (each priced for that space). Deterministic:
 * pass `now` for stable tests. */
export function generateRecurringSlots(
  config: RecurringConfig,
  settings: VenueSettingsLike,
  now: Date = new Date(),
): GenerateResult {
  const errors = collectErrors(config, settings);
  if (errors.length > 0 || !config.startDate || !config.endDate) {
    return { slots: [], summary: emptySummary(), errors };
  }

  const summary = emptySummary();
  const slots: GenerateResult['slots'] = [];
  const weekdays = new Set(config.weekdays);
  const weeklyOff = new Set(settings.weekly_off_days);
  const holidays = new Set(settings.holidays);
  const maxStart = addDays(now, effectiveMaxAdvance(settings.rules.max_advance_days));
  const last = startOfDay(config.endDate);

  let cursor = startOfDay(config.startDate);
  while (cursor <= last) {
    const weekday = cursor.getDay();
    if (weekdays.has(weekday)) {
      if (config.skipWeeklyOff && weeklyOff.has(weekday)) {
        summary.skippedWeeklyOff += 1;
      } else if (config.skipHolidays && holidays.has(format(cursor, 'yyyy-MM-dd'))) {
        summary.skippedHolidays += 1;
      } else {
        addDaySlots(cursor, weekday, config, { now, maxStart }, slots, summary);
      }
    }
    cursor = addDays(cursor, 1);
  }

  return { slots, summary, errors: [] };
}

/** One generated slot per space for the window, updating the summary. */
function pushSpaceSlots(
  window: { start: Date; end: Date },
  wholeDay: boolean,
  weekday: number,
  config: RecurringConfig,
  slots: GenerateResult['slots'],
  summary: PreviewSummary,
) {
  for (const space of config.spaces) {
    const price = Math.max(0, Math.round(space.price));
    slots.push({
      start_at: window.start.toISOString(),
      end_at: window.end.toISOString(),
      whole_day: wholeDay,
      price,
      space_label: space.label,
      capacity: Math.max(0, Math.round(space.capacity)),
      notes: '',
      weekday,
    });
    summary.total += 1;
    summary.estimatedRevenue += price;
    const bucket = summary.bySpace[space.label] ?? { count: 0, price, capacity: space.capacity };
    bucket.count += 1;
    bucket.price = price;
    bucket.capacity = space.capacity;
    summary.bySpace[space.label] = bucket;
  }
}

/** Emits every (time range × space) slot for one eligible day — or one
 * whole-day slot per space — updating the summary. Past / beyond-cap windows
 * are skipped and counted per time range. */
function addDaySlots(
  day: Date,
  weekday: number,
  config: RecurringConfig,
  bounds: { now: Date; maxStart: Date },
  slots: GenerateResult['slots'],
  summary: PreviewSummary,
) {
  if (config.wholeDay) {
    // Today's whole day starts a few minutes from now (never a past midnight);
    // a day already fully over yields an inverted window and is skipped.
    const window = wholeDayWindow(day, day, bounds.now);
    if (!isAfter(window.end, window.start)) {
      summary.skippedPast += 1;
    } else if (window.start > bounds.maxStart) {
      summary.skippedBeyondCap += 1;
    } else {
      pushSpaceSlots(window, true, weekday, config, slots, summary);
    }
    return;
  }
  for (const range of config.timeSlots) {
    const start = combine(day, range.start);
    const end = combine(day, range.end);
    if (start <= bounds.now) {
      summary.skippedPast += 1;
    } else if (start > bounds.maxStart) {
      summary.skippedBeyondCap += 1;
    } else {
      pushSpaceSlots({ start, end }, false, weekday, config, slots, summary);
    }
  }
}
