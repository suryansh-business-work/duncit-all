import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text } from 'tamagui';
import {
  makeBookingOffersSchema,
  toBookingOffersValues,
  type BookingOffersValues,
  type VenueOfferSettings,
} from '@duncit/forms/schemas';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';

export interface BookingOffersFormProps {
  /** The venue's own settings as stored (`VenueSettings.offers`); 0 = Duncit's default. */
  stored: VenueOfferSettings | null;
  /** What is in effect for the venue (`Venue.offer_*`): its own value, or Duncit's default where it set 0. */
  effective: VenueOfferSettings;
  saving: boolean;
  saved: boolean;
  error: string | null;
  onSubmit: (values: BookingOffersValues) => void;
}

/**
 * The venue's Booking offers: the fewest guests a host's offer may be for, and
 * the hours either side has to answer an offer or a counter before it expires.
 * 0 leaves it to Duncit's default; each hint says what is in effect now. The
 * Tamagui twin of mWeb's and the Partners console's Booking offers card — the
 * same rules and the same `venueSettings.offers.*` copy (rule 27).
 */
export function BookingOffersForm({
  stored,
  effective,
  saving,
  saved,
  error,
  onSubmit,
}: Readonly<BookingOffersFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeBookingOffersSchema(t), [t]);
  const { control, handleSubmit } = useForm<BookingOffersValues, unknown, BookingOffersValues>({
    resolver: formResolver<BookingOffersValues>(schema),
    defaultValues: toBookingOffersValues(stored),
  });
  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <SurfaceCard gap={16} testID="venue-offer-settings-form">
      <SectionHeader title={t('venueSettings.offers.title')} />
      <Text fontSize={13} color="$muted">
        {t('venueSettings.offers.intro')}
      </Text>
      <FormTextField
        control={control}
        name="min_guests"
        label={t('venueSettings.offers.minGuests')}
        hint={t('venueSettings.offers.minGuestsHint', {
          vars: { count: effective.min_guests },
        })}
        keyboardType="number-pad"
        digitsOnly
      />
      <FormTextField
        control={control}
        name="response_hours"
        label={t('venueSettings.offers.responseHours')}
        hint={t('venueSettings.offers.responseHoursHint', {
          vars: { count: effective.response_hours },
        })}
        keyboardType="number-pad"
        digitsOnly
      />
      {error ? (
        <Text testID="venue-offer-settings-error" role="alert" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
      {saved ? (
        <Text testID="venue-offer-settings-saved" role="status" fontSize={13} color="$success">
          {t('venueSettings.offers.saved')}
        </Text>
      ) : null}
      <PrimaryButton
        testID="venue-offer-settings-save"
        label={saving ? t('venueSettings.saving') : t('venueSettings.offers.save')}
        onPress={() => {
          submit().catch(() => undefined);
        }}
        disabled={saving}
        loading={saving}
      />
    </SurfaceCard>
  );
}
