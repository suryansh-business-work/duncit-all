import { useCallback, useMemo, useState } from 'react';
import { generateRecurringSlots, readVenueSettings } from '@duncit/slots';

import { VenueSlotConflictMode } from '@/generated/graphql/graphql';
import { CreateVenueSlotsDocument } from '@/graphql/venue-availability';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import {
  initialRecurringForm,
  seedSpaces,
  spaceSeedKey,
  toRecurringConfig,
  type RecurringForm,
} from './recurring-form';

/**
 * Owns the recurring form and derives the live preview from the shared
 * generator — the RN twin of `useRecurringDialog` (rule 27). Overlaps are the
 * server's call: the batch carries the chosen conflict mode and comes back
 * with whatever survived it.
 */
export function useRecurringSheet(
  venueId: string,
  settings: unknown,
  capacityItems: readonly { label: string; capacity: number }[],
  venueCapacity: number,
  onDone: () => void,
) {
  const { t } = useTranslation();
  const seed = useMemo(
    () => seedSpaces(capacityItems, venueCapacity),
    [capacityItems, venueCapacity],
  );
  const [form, setForm] = useState<RecurringForm>(() => initialRecurringForm(seed));
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Re-seeding is keyed on the SPACES, not on the venue row: saving venue
  // rules from inside this sheet rewrites the venue, and re-seeding on that
  // would throw away prices the owner had already typed.
  const seedKey = spaceSeedKey(seed);
  const [seededFrom, setSeededFrom] = useState(seedKey);
  if (seedKey !== seededFrom) {
    setSeededFrom(seedKey);
    setForm((f) => ({ ...f, spaces: seed.map((space) => ({ ...space })) }));
  }

  const patch = useCallback((p: Partial<RecurringForm>) => setForm((f) => ({ ...f, ...p })), []);
  const reset = () => {
    setForm(initialRecurringForm(seed));
    setServerError(null);
  };

  const venueSettings = useMemo(() => readVenueSettings(settings), [settings]);
  const result = useMemo(
    () => generateRecurringSlots(toRecurringConfig(form, venueSettings), venueSettings),
    [form, venueSettings],
  );

  const submit = async (): Promise<boolean> => {
    if (result.errors.length > 0 || result.slots.length === 0) return false;
    setSubmitting(true);
    setServerError(null);
    const slots = result.slots.map((slot) => ({
      start_at: slot.start_at,
      end_at: slot.end_at,
      whole_day: slot.whole_day,
      price: slot.price,
      space_label: slot.space_label,
      capacity: slot.capacity,
    }));
    const onConflict =
      form.conflictMode === 'REPLACE' ? VenueSlotConflictMode.Replace : VenueSlotConflictMode.Skip;
    try {
      await graphqlRequest(
        CreateVenueSlotsDocument,
        { input: { venue_id: venueId, slots, on_conflict: onConflict } },
        { auth: true },
      );
      onDone();
      return true;
    } catch (e) {
      setServerError(e instanceof Error ? e.message : t('availability.recurring.createFailed'));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { form, patch, reset, venueSettings, result, submit, submitting, serverError };
}
