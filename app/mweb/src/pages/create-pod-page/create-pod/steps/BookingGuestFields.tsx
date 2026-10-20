import { useEffect } from 'react';
import { FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import { clampBookingPax } from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodForm } from '../create-pod.types';
import type { VenueBookingPricing } from '../venueBooking';

interface Props {
  form: CreatePodForm;
  pricing: VenueBookingPricing;
}

const DIRTY = { shouldDirty: true, shouldValidate: true } as const;

/**
 * The booking's guests (PER_PAX venues only, held inside the venue's range —
 * the pod's spots follow it) and whether pets come (only when the venue has a
 * pet fee). Native twin: BookingGuestFields.
 */
export default function BookingGuestFields({ form, pricing }: Readonly<Props>) {
  const { t } = useTranslation();
  const perPax = pricing.model === 'PER_PAX';
  const pax = form.watch('venue_booking_pax');
  const pets = form.watch('venue_booking_pets');

  const commitPax = (value: number) => {
    const next = clampBookingPax(value, pricing.min_pax, pricing.max_pax);
    form.setValue('venue_booking_pax', next, DIRTY);
    form.setValue('no_of_spots', next, DIRTY);
  };

  // A per-guest venue prices nothing at 0 guests: start from the spots the
  // space filled in, held inside the venue's range.
  useEffect(() => {
    if (perPax && !form.getValues('venue_booking_pax')) commitPax(form.getValues('no_of_spots'));
    // Only when the venue's model or range changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perPax, pricing.min_pax, pricing.max_pax]);

  const range =
    pricing.max_pax > 0
      ? t('mweb.createPod.bookingGuestsRange', { vars: { min: Math.max(1, pricing.min_pax), max: pricing.max_pax } })
      : t('mweb.createPod.bookingGuestsMin', { vars: { min: Math.max(1, pricing.min_pax) } });

  return (
    <Stack spacing={1.5}>
      {perPax && (
        <TextField
          data-testid="create-pod-booking-guests"
          type="number"
          label={t('mweb.createPod.bookingGuests')}
          value={pax || ''}
          onChange={(e) => form.setValue('venue_booking_pax', Number(e.target.value) || 0, { shouldDirty: true })}
          onBlur={(e) => commitPax(Number(e.target.value) || 0)}
          helperText={range}
          slotProps={{ htmlInput: { min: pricing.min_pax, max: pricing.max_pax || undefined, inputMode: 'numeric' } }}
          fullWidth
        />
      )}
      {pricing.pet_fee > 0 && (
        <FormControlLabel
          control={
            <Switch
              data-testid="create-pod-booking-pets"
              checked={pets}
              onChange={(e) => form.setValue('venue_booking_pets', e.target.checked, DIRTY)}
            />
          }
          label={t('mweb.createPod.bookingPets')}
        />
      )}
    </Stack>
  );
}
