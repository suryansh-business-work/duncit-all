import { FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { SpotsStepper, mwebSpotsLabels } from '@duncit/ui';
import type { SpotsBounds } from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  /** The range the pod may be sized within (activity + venue + space). */
  spots: SpotsBounds;
  /** The fewest guests the venue takes an offer for (0 = none) — said under the spots. */
  minGuests?: number;
}

const DIRTY = { shouldDirty: true, shouldValidate: true } as const;

/**
 * The pod's spots — which ARE the booking's guests, so there is one number,
 * held inside the activity's minimum, the venue's minimum guests and the
 * space's capacity, and quoted as it changes — and whether pets come (the quote
 * adds the venue's pet fee, if it has one). Native twin: BookingGuestFields.
 */
export default function BookingGuestFields({ form, spots, minGuests = 0 }: Readonly<Props>) {
  const { t } = useTranslation();
  const pets = form.watch('venue_booking_pets');
  const boundsHint = spots.slidable
    ? t('mweb.createPod.spotsVenueHint', { vars: { min: spots.min, max: spots.max } })
    : undefined;

  return (
    <Stack spacing={1.5}>
      <SpotsStepper
        labels={mwebSpotsLabels(t)}
        value={Number(form.watch('no_of_spots')) || 0}
        onChange={(next) => form.setValue('no_of_spots', next, DIRTY)}
        error={form.formState.errors.no_of_spots?.message}
        min={spots.min}
        max={spots.max}
        slidable={spots.slidable}
        boundsHint={boundsHint}
        // Only fixed when the venue and space leave no room to choose.
        readOnly={spots.max <= spots.min}
      />
      {minGuests > 0 && (
        <Typography variant="caption" data-testid="create-pod-venue-minimum" sx={{ color: 'text.secondary' }}>
          {t('availability.offers.ask.venueMinimum', { vars: { min: minGuests } })}
        </Typography>
      )}
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
    </Stack>
  );
}
