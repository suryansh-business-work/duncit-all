import { BannerKitPanel } from '@duncit/shell';
import VenueSetupPage from '../venue-setup/VenueSetupPage';

/** Venue Options > Banner Kit: what the picked venue's pod banners are made from, at any status. */
export default function VenueBannerKitPage() {
  return (
    <VenueSetupPage titleKey="mweb.studioOptions.bannerKit" hintKey="mweb.studioOptions.venueBannerKitHint" testId="venue-banner-kit-page">
      {(venue) => <BannerKitPanel key={venue.id} entity="VENUE" mode="owner" id={venue.id} />}
    </VenueSetupPage>
  );
}
