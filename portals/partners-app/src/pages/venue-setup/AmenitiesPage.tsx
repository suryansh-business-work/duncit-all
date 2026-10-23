import AmenitiesSection from '../register-venue-page/sections/AmenitiesSection';
import VenueSetupEditor from './VenueSetupEditor';
import VenueSetupPage from './VenueSetupPage';

/** Venue Options > Amenities & Security: facilities, amenities and safety, at any status. */
export default function AmenitiesPage() {
  return (
    <VenueSetupPage titleKey="mweb.studioOptions.amenities" hintKey="mweb.studioOptions.amenitiesHint" testId="venue-amenities-page">
      {(venue) => (
        <VenueSetupEditor key={venue.id} venueId={venue.id} section="amenities" testId="venue-amenities">
          {({ form, config }) => <AmenitiesSection form={form} config={config} />}
        </VenueSetupEditor>
      )}
    </VenueSetupPage>
  );
}
