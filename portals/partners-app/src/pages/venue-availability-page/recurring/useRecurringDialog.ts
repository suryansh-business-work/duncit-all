import { useMemo, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { addDays } from 'date-fns';
import { generateRecurringSlots } from './generate-recurring-slots';
import type { RecurringConfig } from './recurring.types';
import { hhmmToDate, readVenueSettings, timeToHHMM } from './settings-map';
import { CREATE_VENUE_SLOTS } from './recurring.queries';
import { DELETE_VENUE_SLOT, VENUE_SLOTS } from '../queries';

export type ConflictMode = 'SKIP' | 'REPLACE';

export interface RecurringForm {
  startDate: Date | null;
  endDate: Date | null;
  weekdays: number[];
  startTime: Date | null;
  endTime: Date | null;
  defaultPrice: string;
  perDayPrice: Record<number, string>;
  skipWeeklyOff: boolean;
  skipHolidays: boolean;
  conflictMode: ConflictMode;
}

export const initialRecurringForm = (): RecurringForm => ({
  startDate: null,
  endDate: null,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  startTime: hhmmToDate('13:00'),
  endTime: hhmmToDate('14:00'),
  defaultPrice: '399',
  perDayPrice: {},
  skipWeeklyOff: true,
  skipHolidays: true,
  conflictMode: 'SKIP',
});

const toInt = (v: string) => Math.max(0, Math.round(Number(v) || 0));

interface Interval {
  start_at: string;
  end_at: string;
}
interface ExistingSlot extends Interval {
  id: string;
  status: string;
}

function intervalsOverlap(a: Interval, b: Interval) {
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
 * and runs a conflict-aware create. Both modes fetch the existing window and act
 * on real time-overlaps: Skip drops colliding generated slots; Replace deletes
 * the colliding non-booked slots and skips ones that collide with a booked slot. */
export function useRecurringDialog(
  venueId: string,
  settings: unknown,
  onDone: () => Promise<void> | void,
) {
  const [form, setForm] = useState<RecurringForm>(initialRecurringForm);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const client = useApolloClient();
  const [createSlots] = useMutation(CREATE_VENUE_SLOTS);
  const [deleteSlot] = useMutation(DELETE_VENUE_SLOT);

  const patch = (p: Partial<RecurringForm>) => setForm((f) => ({ ...f, ...p }));
  const reset = () => {
    setForm(initialRecurringForm());
    setServerError(null);
  };

  const venueSettings = useMemo(() => readVenueSettings(settings), [settings]);

  const config: RecurringConfig = useMemo(
    () => ({
      startDate: form.startDate,
      endDate: form.endDate,
      weekdays: form.weekdays,
      startTime: timeToHHMM(form.startTime),
      endTime: timeToHHMM(form.endTime),
      defaultPrice: toInt(form.defaultPrice),
      // A blank or deselected-day override is treated as "no override" so the
      // generator falls back to the default price (never a ₹0 slot).
      perDayPrice: Object.fromEntries(
        Object.entries(form.perDayPrice)
          .filter(([d, p]) => form.weekdays.includes(Number(d)) && String(p).trim() !== '')
          .map(([d, p]) => [Number(d), toInt(p)]),
      ),
      skipWeeklyOff: form.skipWeeklyOff,
      skipHolidays: form.skipHolidays,
    }),
    [form],
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
      const generated = result.slots.map((s) => ({ start_at: s.start_at, end_at: s.end_at, price: s.price }));
      const existing = await fetchExisting(form.startDate, form.endDate);

      let slots = generated;
      if (form.conflictMode === 'REPLACE') {
        const overlapping = existing.filter((e) => generated.some((g) => intervalsOverlap(g, e)));
        const bookedOverlap = overlapping.filter((e) => e.status === 'BOOKED');
        for (const e of overlapping.filter((o) => o.status !== 'BOOKED')) {
          await deleteSlot({ variables: { slot_id: e.id } });
        }
        // Generated slots that still collide with a booked slot can't be created.
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
