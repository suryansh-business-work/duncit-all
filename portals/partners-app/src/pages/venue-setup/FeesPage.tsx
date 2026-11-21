import { Stack } from '@mui/material';
import { VenueBookingOffers } from './booking-offers';
import { VenuePricingPartEditor } from '@duncit/availability-calendar';
import VenueSetupPage from './VenueSetupPage';

/**
 * Venue Options > Fees & Minimum Spend — the venue's one pricing setup: its
 * booking offers and minimum spend (the rules a host's offer must meet), then
 * the cleaning and pet fees, deposit and GST added to the price. Each part saves
 * on its own, so neither save can overwrite the other.
 */
export default function FeesPage() {
  return (
    <VenueSetupPage titleKey="mweb.studioOptions.venueFees" hintKey="mweb.studioOptions.venueFeesHint" testId="venue-fees-page">
      {(venue) => (
        <Stack spacing={2.5} key={venue.id}>
          <VenueBookingOffers venueId={venue.id} />
          <VenuePricingPartEditor venueId={venue.id} part="fees" />
        </Stack>
      )}
    </VenueSetupPage>
  );
}
