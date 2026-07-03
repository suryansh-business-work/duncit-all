import { addDays, format, set as setTimeOnDate, startOfDay } from 'date-fns';
import type {
  GenerateResult,
  PreviewSummary,
  RecurringConfig,
  TimeRange,
  VenueSettingsLike,
} from './recurring.types';
import { effectiveMaxAdvance } from './settings-map';

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const combine = (date: Date, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return setTimeOnDate(date, { hours: h, minutes: m, seconds: 0, milliseconds: 0 });
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
function timeSlotErrors(config: RecurringConfig, settings: VenueSettingsLike): string[] {
  const errors: string[] = [];
  if (config.timeSlots.length === 0) {
    errors.push('Add at least one time slot.');
    return errors;
  }
  const { open, close } = settings.operating_hours;
  for (const t of config.timeSlots) {
    if (!HHMM_RE.test(t.start) || !HHMM_RE.test(t.end)) {
      errors.push('Enter a valid start and end time for every time slot.');
      return errors;
    }
    if (toMinutes(t.end) <= toMinutes(t.start)) {
      errors.push('Each time slot must end after it starts.');
    }
    if (HHMM_RE.test(open) && toMinutes(t.start) < toMinutes(open)) {
      errors.push(`A time slot starts before the venue opens (${open}).`);
    }
    if (HHMM_RE.test(close) && toMinutes(t.end) > toMinutes(close)) {
      errors.push(`A time slot ends after the venue closes (${close}).`);
    }
  }
  errors.push(...gapErrors(config.timeSlots, Math.max(0, Math.round(config.bufferMinutes))));
  return errors;
}

/** Overlap + minimum-gap check across the sorted ranges. */
function gapErrors(slots: TimeRange[], buffer: number): string[] {
  const sorted = [...slots].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = toMinutes(sorted[i].start) - toMinutes(sorted[i - 1].end);
    if (gap < 0) return ['Time slots must not overlap.'];
    if (buffer > 0 && gap < buffer) return [`Keep at least a ${buffer}-minute gap between time slots.`];
  }
  return [];
}

/** Validates the config against itself + venue operating hours, returning a list
 * of human-readable errors (empty when valid). */
function collectErrors(config: RecurringConfig, settings: VenueSettingsLike): string[] {
  const errors: string[] = [];
  if (!config.startDate || !config.endDate) errors.push('Pick a start and end date.');
  if (config.startDate && config.endDate && config.endDate < startOfDay(config.startDate)) {
    errors.push('End date must be on or after the start date.');
  }
  if (config.weekdays.length === 0) errors.push('Select at least one day to repeat on.');
  errors.push(...timeSlotErrors(config, settings));
  if (config.spaces.length === 0) errors.push('Add at least one space with a price.');
  if (config.spaces.some((s) => s.price < 0)) errors.push('Price cannot be negative.');
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

/** Emits every (time range × space) slot for one eligible day, updating the
 * summary. Past / beyond-cap ranges are skipped and counted per time range. */
function addDaySlots(
  day: Date,
  weekday: number,
  config: RecurringConfig,
  bounds: { now: Date; maxStart: Date },
  slots: GenerateResult['slots'],
  summary: PreviewSummary,
) {
  for (const range of config.timeSlots) {
    const start = combine(day, range.start);
    const end = combine(day, range.end);
    if (start <= bounds.now) {
      summary.skippedPast += 1;
    } else if (start > bounds.maxStart) {
      summary.skippedBeyondCap += 1;
    } else {
      for (const space of config.spaces) {
        const price = Math.max(0, Math.round(space.price));
        slots.push({
          start_at: start.toISOString(),
          end_at: end.toISOString(),
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
  }
}
