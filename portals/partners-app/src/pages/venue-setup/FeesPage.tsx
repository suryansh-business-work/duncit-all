import VenuePricingPartEditor from './VenuePricingPartEditor';
import VenueSetupPage from './VenueSetupPage';

/** Venue Options > Fees & Minimum Spend: minimum spend, cleaning and pet fees, deposit and GST. */
export default function FeesPage() {
  return (
    <VenueSetupPage titleKey="mweb.studioOptions.venueFees" hintKey="mweb.studioOptions.venueFeesHint" testId="venue-fees-page">
      {(venue) => <VenuePricingPartEditor key={venue.id} venueId={venue.id} part="fees" />}
    </VenueSetupPage>
  );
}
