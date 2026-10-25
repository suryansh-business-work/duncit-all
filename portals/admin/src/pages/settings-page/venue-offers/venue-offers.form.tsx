import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { VENUE_OFFER_DEFAULT_LIMITS, makeVenueOffersSchema } from './venue-offers.schema';
import type { VenueOfferDefaultsValues, VenueOffersFormProps } from './venue-offers.types';

/**
 * The two platform defaults for venue booking offers: the fewest guests an
 * offer may be for, and the hours either side has to answer an offer or a
 * counter. A venue that set its own (Partners > Venue settings) keeps it.
 */
export default function VenueOffersForm({ initialValues, saving, error, onSubmit }: Readonly<VenueOffersFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeVenueOffersSchema(t), [t]);
  const { control, handleSubmit, reset, formState } = useForm<VenueOfferDefaultsValues>({
    defaultValues: initialValues,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  // Re-seeds when the stored values change (a save, or a refetch).
  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const submit = handleSubmit((values) => onSubmit(values));
  const { minGuests, responseHours } = VENUE_OFFER_DEFAULT_LIMITS;

  return (
    <Stack component="form" noValidate onSubmit={submit} spacing={2} data-testid="venue-offers-form">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <RhfTextField
          control={control}
          name="venue_offer_min_guests_default"
          type="number"
          required
          label={t('admin.venueOfferSettings.minGuests')}
          hint={t('admin.venueOfferSettings.minGuestsHint', { vars: minGuests })}
          slotProps={{ htmlInput: { ...minGuests, step: 1, inputMode: 'numeric' } }}
        />
        <RhfTextField
          control={control}
          name="venue_offer_response_hours_default"
          type="number"
          required
          label={t('admin.venueOfferSettings.responseHours')}
          hint={t('admin.venueOfferSettings.responseHoursHint', { vars: responseHours })}
          slotProps={{ htmlInput: { ...responseHours, step: 1, inputMode: 'numeric' } }}
        />
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <DuncitButton
        type="submit"
        variant="contained"
        startIcon={<SaveIcon />}
        disabled={saving || !formState.isDirty}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="save-venue-offers"
      >
        {saving ? t('admin.venueOfferSettings.saving') : t('admin.venueOfferSettings.save')}
      </DuncitButton>
    </Stack>
  );
}
