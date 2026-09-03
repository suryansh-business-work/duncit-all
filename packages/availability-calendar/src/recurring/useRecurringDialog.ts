import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import {
  generateRecurringSlots,
  hhmmToDate,
  readVenueSettings,
  timeToHHMM,
  type RecurringConfig,
} from '@duncit/slots';
import { CREATE_VENUE_SLOTS } from '../queries';
import type { VenueSpace } from '../types';

/**
 * What a generated slot does when the space is already published for that time.
 * Both values are the server's `VenueSlotConflictMode` verbatim — the whole
 * resolution runs there, so the batch is decided in one place instead of the
 * client reading the calendar back and guessing (rule 40).
 */
export type ConflictMode = 'SKIP' | 'REPLACE';

export interface TimeSlotRow {
  id: string;
  start: Date | null;
  end: Date | null;
}

// Stable unique ids keep React keys off the array index (SonarQube S6479).
let timeSeq = 0;
export const newTimeSlot = (start = '13:00', end = '14:00'): TimeSlotRow => {
  timeSeq += 1;
  return {
    id: `ts-${timeSeq}`,
    start: hhmmToDate(start),
    end: hhmmToDate(end),
  };
};

/** A venue space the owner can price + toggle for this run. */
export interface SpaceRow {
  label: string; // '' = whole venue
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
  timeSlots: TimeSlotRow[];
  spaces: SpaceRow[];
  skipWeeklyOff: boolean;
  skipHolidays: boolean;
  conflictMode: ConflictMode;
}

const DEFAULT_PRICE = '399';

/** The venue's spaces as priceable rows, or a single whole-venue row when the
 * venue lists no named capacity items. */
export function seedSpaces(capacityItems: VenueSpace[], venueCapacity: number): SpaceRow[] {
  if (capacityItems.length > 0) {
    return capacityItems.map((item) => ({
      label: item.label,
      capacity: item.capacity,
      price: DEFAULT_PRICE,
      enabled: true,
    }));
  }
  return [{ label: '', capacity: Math.max(0, Math.round(venueCapacity) || 0), price: DEFAULT_PRICE, enabled: true }];
}

export const initialRecurringForm = (spaces: SpaceRow[]): RecurringForm => ({
  startDate: null,
  endDate: null,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  wholeDay: false,
  timeSlots: [newTimeSlot()],
  spaces: spaces.map((s) => ({ ...s })),
  skipWeeklyOff: true,
  skipHolidays: true,
  conflictMode: 'SKIP',
});

const toInt = (v: string) => Math.max(0, Math.round(Number(v) || 0));

/** Owns the recurring form + derives the live preview from the tested generator.
 * Overlaps are the server's call: the batch carries the chosen conflict mode
 * and comes back with whatever survived it. */
export function useRecurringDialog(
  venueId: string,
  settings: unknown,
  capacityItems: VenueSpace[],
  venueCapacity: number,
  onDone: () => Promise<void> | void,
) {
  const { t } = useTranslation();
  const seed = useMemo(() => seedSpaces(capacityItems, venueCapacity), [capacityItems, venueCapacity]);
  const [form, setForm] = useState<RecurringForm>(() => initialRecurringForm(seed));
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createSlots] = useMutation<{ createVenueSlots: { id: string }[] }>(CREATE_VENUE_SLOTS);

  // The dialog mounts with the PAGE, long before the venue's spaces are known
  // to it, so its very first seed can be the whole-venue placeholder — which is
  // how the owner of a ten-court venue was offered one row reading "Whole
  // venue · Capacity 0".
  //
  // Re-seeding is keyed on the SPACES, not on the query result: saving venue
  // rules from inside this dialog rewrites the cached venue, and re-seeding on
  // that would throw away prices the owner had already typed.
  const seedKey = seed.map((s) => [s.label, s.capacity].join(':')).join('|');
  const [seededFrom, setSeededFrom] = useState(seedKey);
  if (seedKey !== seededFrom) {
    setSeededFrom(seedKey);
    setForm((f) => ({ ...f, spaces: seed.map((s) => ({ ...s })) }));
  }

  const patch = (p: Partial<RecurringForm>) => setForm((f) => ({ ...f, ...p }));
  const reset = () => {
    setForm(initialRecurringForm(seed));
    setServerError(null);
  };

  const venueSettings = useMemo(() => readVenueSettings(settings), [settings]);

  const config: RecurringConfig = useMemo(
    () => ({
      startDate: form.startDate,
      endDate: form.endDate,
      weekdays: form.weekdays,
      wholeDay: form.wholeDay,
      timeSlots: form.timeSlots.map((row) => ({ start: timeToHHMM(row.start), end: timeToHHMM(row.end) })),
      // Only enabled spaces with a filled price generate slots.
      spaces: form.spaces
        .filter((s) => s.enabled && String(s.price).trim() !== '')
        .map((s) => ({ label: s.label, capacity: Math.max(0, Math.round(s.capacity) || 0), price: toInt(s.price) })),
      bufferMinutes: venueSettings.rules.buffer_minutes,
      skipWeeklyOff: form.skipWeeklyOff,
      skipHolidays: form.skipHolidays,
    }),
    [form, venueSettings],
  );

  const result = useMemo(() => generateRecurringSlots(config, venueSettings), [config, venueSettings]);

  const submit = async (): Promise<boolean> => {
    if (result.errors.length > 0 || result.slots.length === 0) {
      return false;
    }
    setSubmitting(true);
    setServerError(null);
    const slots = result.slots.map((s) => ({
      start_at: s.start_at,
      end_at: s.end_at,
      whole_day: s.whole_day,
      price: s.price,
      space_label: s.space_label,
      capacity: s.capacity,
    }));
    let ok = true;
    try {
      await createSlots({
        variables: { input: { venue_id: venueId, slots, on_conflict: form.conflictMode } },
      });
      await onDone();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : t('availability.recurring.createFailed'));
      ok = false;
    }
    setSubmitting(false);
    return ok;
  };

  return { form, patch, reset, venueSettings, result, submit, submitting, serverError, setServerError };
}
