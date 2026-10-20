import { useEffect, useState } from 'react';
import { Input, YStack } from 'tamagui';
import { clampBookingPax } from '@duncit/utils';

import { Field } from '@/components/Field';
import { VenuePricingModel } from '@/generated/graphql/graphql';
import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';
import type { VenueBookingPricing } from '@/hooks/useInstantBooking';
import type { CreatePodForm } from '../../create-pod.types';

interface Props {
  form: CreatePodForm;
  pricing: VenueBookingPricing;
}

const DIRTY = { shouldDirty: true, shouldValidate: true } as const;

/**
 * The booking's guests (PER_PAX venues only, held inside the venue's range —
 * the pod's spots follow it) and whether pets come (only when the venue has a
 * pet fee). mWeb twin: BookingGuestFields.
 */
export function BookingGuestFields({ form, pricing }: Readonly<Props>) {
  const { t } = useTranslation();
  const perPax = pricing.model === VenuePricingModel.PerPax;
  const pax = form.watch('venue_booking_pax');
  const [typed, setTyped] = useState(pax ? String(pax) : '');

  const commitPax = (value: number) => {
    const next = clampBookingPax(value, pricing.min_pax, pricing.max_pax);
    setTyped(String(next));
    form.setValue('venue_booking_pax', next, DIRTY);
    form.setValue('no_of_spots_text', String(next), DIRTY);
  };

  // A per-guest venue prices nothing at 0 guests: start from the spots the
  // space filled in, held inside the venue's range.
  useEffect(() => {
    if (perPax && !form.getValues('venue_booking_pax')) {
      commitPax(Number(form.getValues('no_of_spots_text')) || 0);
    }
    // Only when the venue's model or range changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perPax, pricing.min_pax, pricing.max_pax]);

  const min = Math.max(1, pricing.min_pax);
  const range =
    pricing.max_pax > 0
      ? t('mweb.createPod.bookingGuestsRange', { vars: { min, max: pricing.max_pax } })
      : t('mweb.createPod.bookingGuestsMin', { vars: { min } });

  return (
    <YStack gap={12}>
      {perPax ? (
        <Field
          label={t('mweb.createPod.bookingGuests')}
          hint={range}
          testID="create-pod-booking-guests"
        >
          <Input
            testID="create-pod-booking-guests-input"
            keyboardType="numeric"
            size="$4"
            backgroundColor="$surface"
            color="$color"
            borderColor="$borderColor"
            value={typed}
            onChangeText={setTyped}
            onBlur={() => commitPax(Math.floor(Number(typed)) || 0)}
            aria-label={t('mweb.createPod.bookingGuests')}
          />
        </Field>
      ) : null}
      {pricing.pet_fee > 0 ? (
        <ToggleRow
          testID="create-pod-booking-pets"
          label={t('mweb.createPod.bookingPets')}
          value={form.watch('venue_booking_pets')}
          onChange={(next) => form.setValue('venue_booking_pets', next, DIRTY)}
        />
      ) : null}
    </YStack>
  );
}
