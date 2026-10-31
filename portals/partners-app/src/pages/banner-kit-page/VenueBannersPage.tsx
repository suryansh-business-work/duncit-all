import { PodBannersPanel } from '@duncit/shell';
import VenueSetupPage from '../venue-setup/VenueSetupPage';

/** Venue Options > Banners: Make banners for the picked venue's upcoming pods. */
export default function VenueBannersPage() {
  return (
    <VenueSetupPage titleKey="mweb.studioOptions.banners" hintKey="mweb.studioOptions.bannersHint" testId="venue-banners-page">
      {(venue) => <PodBannersPanel key={venue.id} filter={{ field: 'venue_id', value: venue.id }} />}
    </VenueSetupPage>
  );
}
