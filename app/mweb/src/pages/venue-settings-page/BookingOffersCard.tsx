import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Card, CardContent, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import { notifySuccess } from '../../components/notify';
import { BookingOffersForm, toBookingOffersInput, toBookingOffersValues, type BookingOffersValues } from './booking-offers-form';
import { UPDATE_VENUE_BOOKING_OFFERS, type SettingsVenue } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  venue: SettingsVenue;
  /** Re-reads the venue after a save — what is in effect may have moved. */
  onSaved: () => Promise<unknown>;
}

/** Venue settings > Booking offers, for the venue picked in the frame. */
export default function BookingOffersCard({ venue, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [save, saveState] = useMutation(UPDATE_VENUE_BOOKING_OFFERS);
  const [apiError, setApiError] = useState<string | null>(null);

  // Keyed off the stored VALUES, not the object a refetch hands back fresh.
  const minGuests = venue.settings?.offers?.min_guests ?? 0;
  const responseHours = venue.settings?.offers?.response_hours ?? 0;
  const business = JSON.stringify(venue.settings?.offers?.min_business ?? []);
  const initialValues = useMemo(
    () => toBookingOffersValues({ min_guests: minGuests, response_hours: responseHours, min_business: JSON.parse(business) }),
    [minGuests, responseHours, business]
  );

  const submit = async (values: BookingOffersValues) => {
    setApiError(null);
    try {
      await save({ variables: { venue_doc_id: venue.id, input: { offers: toBookingOffersInput(values) } } });
      notifySuccess(t('venueSettings.offers.saved'));
      await onSaved();
    } catch (saveError) {
      setApiError(parseApiError(saveError));
    }
  };

  return (
    <Card sx={{ overflow: 'visible' }} data-testid="booking-offers-card">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <SectionHeader testId="booking-offers-header" title={t('venueSettings.offers.title')} />
          <BookingOffersForm
            initialValues={initialValues}
            effective={{ min_guests: venue.offer_min_guests, response_hours: venue.offer_response_hours }}
            saving={saveState.loading}
            error={apiError}
            onSubmit={submit}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
