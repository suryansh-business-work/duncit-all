import { YStack } from 'tamagui';
import type { SpotsBounds } from '@duncit/utils';

import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';
import type { VenueBookingPricing } from '@/hooks/useInstantBooking';
import { SpotsStepper } from '../../SpotsStepper';
import type { CreatePodForm } from '../../create-pod.types';

interface Props {
  form: CreatePodForm;
  pricing: VenueBookingPricing;
  /** The range the pod may be sized within (activity + venue + space). */
  spots: SpotsBounds;
}

const DIRTY = { shouldDirty: true, shouldValidate: true } as const;

/**
 * The pod's spots — which ARE the booking's guests, so there is one number,
 * held inside the activity's minimum, the venue's guest range and the space's
 * capacity, and quoted as it changes — and whether pets come (only when the
 * venue has a pet fee). mWeb twin: BookingGuestFields.
 */
export function BookingGuestFields({ form, pricing, spots }: Readonly<Props>) {
  const { t } = useTranslation();
  const boundsHint = spots.slidable
    ? t('mweb.createPod.spotsVenueHint', { vars: { min: spots.min, max: spots.max } })
    : undefined;

  return (
    <YStack gap={12}>
      <SpotsStepper
        value={form.watch('no_of_spots_text')}
        onChange={(next) => form.setValue('no_of_spots_text', next, DIRTY)}
        error={form.formState.errors.no_of_spots_text?.message}
        min={spots.min}
        max={spots.max}
        slidable={spots.slidable}
        boundsHint={boundsHint}
        // Only fixed when the venue and space leave no room to choose.
        readOnly={spots.max <= spots.min}
      />
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
