import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, Typography } from '@mui/material';
import { MinBusinessFields } from '@duncit/availability-calendar';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { BOOKING_OFFER_LIMITS, makeBookingOffersSchema, type BookingOffersValues, type VenueOfferSettings } from './booking-offers.types';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  initialValues: BookingOffersValues;
  /** What is in effect for the venue (`Venue.offer_*`): its own value, or Duncit's default where it set 0. */
  effective: VenueOfferSettings;
  saving: boolean;
  error: string | null;
  onSubmit: (values: BookingOffersValues) => Promise<void>;
}

/**
 * The venue's Booking offers on mWeb: the fewest guests a host's offer may be
 * for, the hours either side has to answer an offer or a counter (0 leaves each
 * to Duncit's default; each hint says what is in effect now), and the business
 * the venue hopes each booking brings — at least one amount, shown to hosts on
 * Create Pod as a guide. Same rules and
 * copy as the Partners console's card.
 */
export default function BookingOffersForm({ initialValues, effective, saving, error, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeBookingOffersSchema(t), [t]);
  const form = useForm<BookingOffersValues>({ defaultValues: initialValues, resolver: zodResolver(schema), mode: 'onTouched' });

  // The page keys `initialValues` off the stored numbers, so a background
  // refresh never wipes what the owner was typing.
  useEffect(() => {
    form.reset(initialValues);
  }, [initialValues, form]);

  const submit = form.handleSubmit((values) => onSubmit(values));
  const numeric = (max: number) => ({ htmlInput: { min: 0, max, step: 1, inputMode: 'numeric' as const } });

  return (
    <Stack component="form" noValidate onSubmit={submit} spacing={1.5} data-testid="booking-offers-form">
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('venueSettings.offers.intro')}
      </Typography>
      <RhfTextField
        control={form.control}
        name="min_guests"
        type="number"
        label={t('venueSettings.offers.minGuests')}
        hint={t('venueSettings.offers.minGuestsHint', { vars: { count: effective.min_guests } })}
        data-testid="booking-offers-min-guests"
        slotProps={numeric(BOOKING_OFFER_LIMITS.minGuestsMax)}
      />
      <RhfTextField
        control={form.control}
        name="response_hours"
        type="number"
        label={t('venueSettings.offers.responseHours')}
        hint={t('venueSettings.offers.responseHoursHint', { vars: { count: effective.response_hours } })}
        data-testid="booking-offers-response-hours"
        slotProps={numeric(BOOKING_OFFER_LIMITS.responseHoursMax)}
      />
      <MinBusinessFields control={form.control} idPrefix="booking-offers" disabled={saving} />
      {error && <Alert severity="error" data-testid="booking-offers-error">{error}</Alert>}
      <DuncitButton type="submit" variant="contained" size="large" fullWidth disabled={saving} data-testid="booking-offers-save">
        {saving ? t('venueSettings.saving') : t('venueSettings.offers.save')}
      </DuncitButton>
    </Stack>
  );
}
