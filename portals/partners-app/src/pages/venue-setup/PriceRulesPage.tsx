import VenuePricingPartEditor from './VenuePricingPartEditor';
import VenueSetupPage from './VenueSetupPage';

/** Venue Options > Price Rules: weekday surcharges, date overrides and date ranges. */
export default function PriceRulesPage() {
  return (
    <VenueSetupPage titleKey="mweb.studioOptions.priceRules" hintKey="mweb.studioOptions.priceRulesHint" testId="venue-price-rules-page">
      {(venue) => <VenuePricingPartEditor key={venue.id} venueId={venue.id} part="rules" />}
    </VenueSetupPage>
  );
}
