import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { MinBusinessFields } from '@duncit/availability-calendar';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { BOOKING_OFFER_LIMITS, makeBookingOffersSchema } from './booking-offers.schema';
import type { BookingOffersFormProps, BookingOffersValues } from './booking-offers.types';

/**
 * The venue's Booking offers: the fewest guests a host's offer may be for, the
 * hours either side has to answer an offer or a counter before it expires (0
 * leaves each to Duncit's default, and each hint says what is in effect now),
 * and the business the venue hopes each booking brings — at least one amount,
 * which hosts see on Create Pod as a guide.
 */
export default function BookingOffersForm({
  initialValues,
  effective,
  saving,
  error,
  onSubmit,
}: Readonly<BookingOffersFormProps>) {
  const { t } = useTranslation();
  // The schema carries the reader's messages, so it is built from their `t`.
  const schema = useMemo(() => makeBookingOffersSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<BookingOffersValues>({
    defaultValues: initialValues,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  // A refetched venue replaces what the form holds; the card keys
  // `initialValues` off the stored numbers, so a background refresh never
  // wipes what the owner was typing.
  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Stack component="form" noValidate onSubmit={submit} spacing={2} data-testid="booking-offers-form">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('venueSettings.offers.intro')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <RhfTextField
          control={control}
          name="min_guests"
          type="number"
          label={t('venueSettings.offers.minGuests')}
          hint={t('venueSettings.offers.minGuestsHint', { vars: { count: effective.min_guests } })}
          slotProps={{
            htmlInput: { min: 0, max: BOOKING_OFFER_LIMITS.minGuestsMax, step: 1, inputMode: 'numeric' },
          }}
        />
        <RhfTextField
          control={control}
          name="response_hours"
          type="number"
          label={t('venueSettings.offers.responseHours')}
          hint={t('venueSettings.offers.responseHoursHint', { vars: { count: effective.response_hours } })}
          slotProps={{
            htmlInput: { min: 0, max: BOOKING_OFFER_LIMITS.responseHoursMax, step: 1, inputMode: 'numeric' },
          }}
        />
      </Stack>
      <MinBusinessFields control={control} idPrefix="booking-offers" disabled={saving} />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <DuncitButton type="submit" variant="contained" disabled={saving} sx={{ alignSelf: 'flex-start' }}>
        {saving ? t('venueSettings.saving') : t('venueSettings.offers.save')}
      </DuncitButton>
    </Stack>
  );
}
