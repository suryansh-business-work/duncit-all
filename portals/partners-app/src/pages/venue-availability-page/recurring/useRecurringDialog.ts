import { useMemo, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { addDays } from 'date-fns';
import { generateRecurringSlots } from './generate-recurring-slots';
import type { RecurringConfig } from './recurring.types';
import { hhmmToDate, readVenueSettings, timeToHHMM } from './settings-map';
import { CREATE_VENUE_SLOTS } from './recurring.queries';
import { DELETE_VENUE_SLOT, VENUE_SLOTS } from '../queries';

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

export interface CapacityItem {
  label: string;
  capacity: number;
}

export interface RecurringForm {
  startDate: Date | null;
  endDate: Date | null;
  weekdays: number[];
  timeSlots: TimeSlotRow[];
  spaces: SpaceRow[];
  skipWeeklyOff: boolean;
  skipHolidays: boolean;
  conflictMode: ConflictMode;
}

const DEFAULT_PRICE = '399';

/** The venue's spaces as priceable rows, or a single whole-venue row when the
 * venue lists no named capacity items. */
export function seedSpaces(capacityItems: CapacityItem[], venueCapacity: number): SpaceRow[] {
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
  timeSlots: [newTimeSlot()],
  spaces: spaces.map((s) => ({ ...s })),
  skipWeeklyOff: true,
  skipHolidays: true,
  conflictMode: 'SKIP',
});

const toInt = (v: string) => Math.max(0, Math.round(Number(v) || 0));

interface Interval {
  start_at: string;
  end_at: string;
  space_label?: string;
}
interface ExistingSlot extends Interval {
  id: string;
  status: string;
  space_label: string;
}

// Two slots clash only when their time windows overlap AND they belong to the
// same space — different spaces may share a time.
function intervalsOverlap(a: Interval, b: Interval) {
  if ((a.space_label ?? '') !== (b.space_label ?? '')) return false;
  const as = new Date(a.start_at).getTime();
  const ae = new Date(a.end_at).getTime();
  const bs = new Date(b.start_at).getTime();
  const be = new Date(b.end_at).getTime();
  return as < be && ae > bs;
}

function dropOverlaps<T extends Interval>(slots: T[], existing: Interval[]): T[] {
  return slots.filter((g) => !existing.some((e) => intervalsOverlap(g, e)));
}

/** Owns the recurring form + derives the live preview from the tested generator,
 * and runs a conflict-aware create. Conflicts are resolved per space: Skip drops
 * colliding generated slots; Replace deletes colliding non-booked slots and skips
 * ones that collide with a booked slot. */
export function useRecurringDialog(
  venueId: string,
  settings: unknown,
  capacityItems: CapacityItem[],
  venueCapacity: number,
  onDone: () => Promise<void> | void,
) {
  const seed = useMemo(() => seedSpaces(capacityItems, venueCapacity), [capacityItems, venueCapacity]);
  const [form, setForm] = useState<RecurringForm>(() => initialRecurringForm(seed));
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const client = useApolloClient();
  const [createSlots] = useMutation(CREATE_VENUE_SLOTS);
  const [deleteSlot] = useMutation(DELETE_VENUE_SLOT);

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
      timeSlots: form.timeSlots.map((t) => ({ start: timeToHHMM(t.start), end: timeToHHMM(t.end) })),
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

  const fetchExisting = async (from: Date, to: Date): Promise<ExistingSlot[]> => {
    const { data } = await client.query({
      query: VENUE_SLOTS,
      variables: { venue_id: venueId, from: from.toISOString(), to: addDays(to, 1).toISOString() },
      fetchPolicy: 'network-only',
    });
    return data?.venueSlots ?? [];
  };

  const submit = async (): Promise<boolean> => {
    if (result.errors.length > 0 || result.slots.length === 0 || !form.startDate || !form.endDate) {
      return false;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const generated = result.slots.map((s) => ({
        start_at: s.start_at,
        end_at: s.end_at,
        price: s.price,
        space_label: s.space_label,
        capacity: s.capacity,
      }));
      const existing = await fetchExisting(form.startDate, form.endDate);

      let slots: typeof generated;
      if (form.conflictMode === 'REPLACE') {
        const overlapping = existing.filter((e) => generated.some((g) => intervalsOverlap(g, e)));
        const bookedOverlap = overlapping.filter((e) => e.status === 'BOOKED');
        for (const e of overlapping.filter((o) => o.status !== 'BOOKED')) {
          await deleteSlot({ variables: { slot_id: e.id } });
        }
        slots = dropOverlaps(generated, bookedOverlap);
      } else {
        slots = dropOverlaps(generated, existing);
      }

      if (slots.length === 0) {
        setServerError('Every matching slot already exists — nothing to add.');
        return false;
      }
      await createSlots({ variables: { input: { venue_id: venueId, slots } } });
      await onDone();
      return true;
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Could not create slots.');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { form, patch, reset, venueSettings, result, submit, submitting, serverError, setServerError };
}
