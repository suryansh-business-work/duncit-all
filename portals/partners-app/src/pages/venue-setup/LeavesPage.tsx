import LeavesSection from '../register-venue-page/sections/LeavesSection';
import VenueSetupPage from './VenueSetupPage';

/** Venue Options > Leaves & Holidays: the dates the venue is closed (venue settings). */
export default function LeavesPage() {
  return (
    <VenueSetupPage titleKey="mweb.studioOptions.leaves" hintKey="mweb.studioOptions.leavesHint" testId="venue-leaves-page">
      {(venue, refetch) => (
        <LeavesSection key={venue.id} venueId={venue.id} holidays={venue.settings?.holidays ?? []} onSaved={refetch} />
      )}
    </VenueSetupPage>
  );
}
