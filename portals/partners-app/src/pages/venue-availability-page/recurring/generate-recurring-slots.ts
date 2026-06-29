import { addDays, format, set as setTimeOnDate, startOfDay } from 'date-fns';
import type {
  GenerateResult,
  PreviewSummary,
  RecurringConfig,
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
  byWeekday: {},
  estimatedRevenue: 0,
  skippedWeeklyOff: 0,
  skippedHolidays: 0,
  skippedPast: 0,
  skippedBeyondCap: 0,
});

/** Validates the config against itself + venue operating hours, returning a list
 * of human-readable errors (empty when valid). */
function collectErrors(config: RecurringConfig, settings: VenueSettingsLike): string[] {
  const errors: string[] = [];
  if (!config.startDate || !config.endDate) errors.push('Pick a start and end date.');
  if (config.startDate && config.endDate && config.endDate < startOfDay(config.startDate)) {
    errors.push('End date must be on or after the start date.');
  }
  if (config.weekdays.length === 0) errors.push('Select at least one day to repeat on.');
  if (!HHMM_RE.test(config.startTime) || !HHMM_RE.test(config.endTime)) {
    errors.push('Enter a valid start and end time.');
  } else {
    if (toMinutes(config.endTime) <= toMinutes(config.startTime)) {
      errors.push('End time must be after start time.');
    }
    const { open, close } = settings.operating_hours;
    if (HHMM_RE.test(open) && toMinutes(config.startTime) < toMinutes(open)) {
      errors.push(`Start time is before the venue opens (${open}).`);
    }
    if (HHMM_RE.test(close) && toMinutes(config.endTime) > toMinutes(close)) {
      errors.push(`End time is after the venue closes (${close}).`);
    }
  }
  if (config.defaultPrice < 0) errors.push('Price cannot be negative.');
  return errors;
}

/** The pure heart of Recurring Availability. Walks every day in the range, keeps
 * the selected weekdays, skips weekly-offs/holidays/past/beyond-cap, applies the
 * per-day price, and returns the slots + a live preview summary. Deterministic:
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
        const start = combine(cursor, config.startTime);
        const end = combine(cursor, config.endTime);
        if (start <= now) {
          summary.skippedPast += 1;
        } else if (start > maxStart) {
          summary.skippedBeyondCap += 1;
        } else {
          const price = Math.max(0, Math.round(config.perDayPrice[weekday] ?? config.defaultPrice));
          slots.push({
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            price,
            notes: '',
            weekday,
          });
          summary.total += 1;
          summary.estimatedRevenue += price;
          const bucket = summary.byWeekday[weekday] ?? { count: 0, price };
          bucket.count += 1;
          bucket.price = price;
          summary.byWeekday[weekday] = bucket;
        }
      }
    }
    cursor = addDays(cursor, 1);
  }

  return { slots, summary, errors: [] };
}
