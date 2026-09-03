import type { RecurringConfig, VenueSettingsView } from '@duncit/slots';

/**
 * The recurring-availability form's shape and seeds — the framework-free twin
 * of the state `useRecurringDialog` owns in @duncit/availability-calendar.
 * That hook is MUI + Apollo and cannot reach this app, so the small seed and
 * config logic is written here against the SAME `@duncit/slots` generator,
 * which is where every rule that matters lives (rules 27 + 40).
 */

/** Both values are the server's `VenueSlotConflictMode` verbatim. */
export type ConflictMode = 'SKIP' | 'REPLACE';

/** One daily window, in venue-local 'HH:mm'. */
export interface TimeRangeRow {
  id: string;
  start: string;
  end: string;
}

/** A venue space the owner can price + toggle for this run. '' = whole venue. */
export interface SpaceRow {
  label: string;
  capacity: number;
  price: string;
  enabled: boolean;
}

export interface RecurringForm {
  startDate: Date | null;
  endDate: Date | null;
  weekdays: number[];
  /** ON = each eligible day becomes one whole-day slot (no time windows). */
  wholeDay: boolean;
  timeSlots: TimeRangeRow[];
  spaces: SpaceRow[];
  skipWeeklyOff: boolean;
  skipHolidays: boolean;
  conflictMode: ConflictMode;
}

const DEFAULT_PRICE = '399';

// Stable unique ids keep React keys off the array index (SonarQube S6479).
let rangeSeq = 0;
export const newTimeRange = (start = '13:00', end = '14:00'): TimeRangeRow => {
  rangeSeq += 1;
  return { id: `tr-${rangeSeq}`, start, end };
};

/** The venue's spaces as priceable rows, or a single whole-venue row when the
 * venue lists no named capacity items. */
export function seedSpaces(
  capacityItems: readonly { label: string; capacity: number }[],
  venueCapacity: number,
): SpaceRow[] {
  if (capacityItems.length > 0) {
    return capacityItems.map((item) => ({
      label: item.label,
      capacity: item.capacity,
      price: DEFAULT_PRICE,
      enabled: true,
    }));
  }
  const capacity = Math.max(0, Math.round(venueCapacity) || 0);
  return [{ label: '', capacity, price: DEFAULT_PRICE, enabled: true }];
}

export const initialRecurringForm = (spaces: SpaceRow[]): RecurringForm => ({
  startDate: null,
  endDate: null,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  wholeDay: false,
  timeSlots: [newTimeRange()],
  spaces: spaces.map((space) => ({ ...space })),
  skipWeeklyOff: true,
  skipHolidays: true,
  conflictMode: 'SKIP',
});

export const toInt = (value: string): number => Math.max(0, Math.round(Number(value) || 0));

/** What identifies a seed, so a venue switch re-seeds the rows while a rule
 * save from inside the sheet (which rewrites the venue) does not. */
export const spaceSeedKey = (spaces: readonly SpaceRow[]): string =>
  spaces.map((space) => `${space.label}:${space.capacity}`).join('|');

/** The form as the generator reads it. Only enabled spaces with a filled
 * price generate slots. */
export function toRecurringConfig(
  form: RecurringForm,
  settings: VenueSettingsView,
): RecurringConfig {
  return {
    startDate: form.startDate,
    endDate: form.endDate,
    weekdays: form.weekdays,
    wholeDay: form.wholeDay,
    timeSlots: form.timeSlots.map((row) => ({ start: row.start, end: row.end })),
    spaces: form.spaces
      .filter((space) => space.enabled && space.price.trim() !== '')
      .map((space) => ({
        label: space.label,
        capacity: Math.max(0, Math.round(space.capacity) || 0),
        price: toInt(space.price),
      })),
    bufferMinutes: settings.rules.buffer_minutes,
    skipWeeklyOff: form.skipWeeklyOff,
    skipHolidays: form.skipHolidays,
  };
}
