import { useMemo, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { addDays } from 'date-fns';
import { generateRecurringSlots } from './generate-recurring-slots';
import type { RecurringConfig } from './recurring.types';
import { hhmmToDate, readVenueSettings, timeToHHMM } from './settings-map';
import { BULK_DELETE_VENUE_SLOTS, CREATE_VENUE_SLOTS } from './recurring.queries';
import { VENUE_SLOTS } from '../queries';

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

interface ExistingSlot {
  start_at: string;
  end_at: string;
}

function dropOverlaps<T extends ExistingSlot>(slots: T[], existing: ExistingSlot[]): T[] {
  return slots.filter((g) => {
    const gs = new Date(g.start_at).getTime();
    const ge = new Date(g.end_at).getTime();
    return !existing.some((e) => {
      const es = new Date(e.start_at).getTime();
      const ee = new Date(e.end_at).getTime();
      return gs < ee && ge > es;
    });
  });
}

/** Owns the recurring form + derives the live preview from the tested generator,
 * and runs a conflict-aware create (Skip drops overlaps client-side, Replace
 * bulk-deletes the window first). */
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
  const [bulkDelete] = useMutation(BULK_DELETE_VENUE_SLOTS);

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
      perDayPrice: Object.fromEntries(
        Object.entries(form.perDayPrice).map(([d, p]) => [Number(d), toInt(p)]),
      ),
      skipWeeklyOff: form.skipWeeklyOff,
      skipHolidays: form.skipHolidays,
    }),
    [form],
  );

  const result = useMemo(() => generateRecurringSlots(config, venueSettings), [config, venueSettings]);

  const submit = async (): Promise<boolean> => {
    if (result.errors.length > 0 || result.slots.length === 0 || !form.startDate || !form.endDate) {
      return false;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      let slots = result.slots.map((s) => ({ start_at: s.start_at, end_at: s.end_at, price: s.price }));
      if (form.conflictMode === 'REPLACE') {
        await bulkDelete({
          variables: {
            input: {
              venue_id: venueId,
              from: form.startDate.toISOString(),
              to: form.endDate.toISOString(),
              weekdays: form.weekdays,
            },
          },
        });
      } else {
        const { data } = await client.query({
          query: VENUE_SLOTS,
          variables: {
            venue_id: venueId,
            from: form.startDate.toISOString(),
            to: addDays(form.endDate, 1).toISOString(),
          },
          fetchPolicy: 'network-only',
        });
        slots = dropOverlaps(slots, data?.venueSlots ?? []);
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
