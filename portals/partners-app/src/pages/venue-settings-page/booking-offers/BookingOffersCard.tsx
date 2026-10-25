import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import BookingOffersForm from './booking-offers.form';
import { toBookingOffersInput, toBookingOffersValues } from './booking-offers.schema';
import type { BookingOffersValues } from './booking-offers.types';
import { UPDATE_VENUE_OFFER_SETTINGS, type VenueSettingsVenue } from '../queries';

interface Props {
  venue: VenueSettingsVenue;
  /** After a save: say so and re-read the venue, whose effective values may have moved. */
  onSaved: (message: string) => Promise<unknown>;
}

/** Venue settings > Booking offers, for the venue picked on the page. */
export default function BookingOffersCard({ venue, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [save, saveState] = useMutation(UPDATE_VENUE_OFFER_SETTINGS);
  const [apiError, setApiError] = useState<string | null>(null);

  // Keyed off the stored NUMBERS rather than the object: a background refresh
  // hands back a fresh object every time, and resetting on that would wipe
  // what the owner typed.
  const minGuests = venue.settings.offers.min_guests;
  const responseHours = venue.settings.offers.response_hours;
  const initialValues = useMemo(
    () => toBookingOffersValues({ min_guests: minGuests, response_hours: responseHours }),
    [minGuests, responseHours],
  );

  const submit = async (values: BookingOffersValues) => {
    setApiError(null);
    try {
      await save({ variables: { venue_doc_id: venue.id, input: { offers: toBookingOffersInput(values) } } });
      await onSaved(t('venueSettings.offers.saved'));
    } catch (saveError) {
      setApiError(parseApiError(saveError));
    }
  };

  return (
    <Card variant="outlined" data-testid="booking-offers-card">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
            {t('venueSettings.offers.title')}
          </Typography>
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
