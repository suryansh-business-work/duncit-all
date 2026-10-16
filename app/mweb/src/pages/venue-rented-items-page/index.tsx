import { useQuery } from '@apollo/client/react';
import { STUDIO_OPTION_LIST } from '@duncit/utils';
import { FOOD_OWNER_VENUES } from '@duncit/venue-food';
import { VenueRentalDesk } from '@duncit/venue-rentals';
import { STUDIO_OPTION_ICON } from '../../components/app-header/profile-drawer/studioOptionIcons';
import { profileIcon } from '../../components/app-header/profile-drawer/profileIcons';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';
import { useTranslation } from '../../i18n/useTranslation';
import VenuePageFrame from '../venue-manage-page/VenuePageFrame';

/**
 * Venue Options → Rented Items for the selected venue: its numbers, its items
 * and its bookings to mark back — the same desk the Partners console and the
 * Venues console mount (@duncit/venue-rentals).
 */
export default function VenueRentedItemsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(FOOD_OWNER_VENUES, { fetchPolicy: 'cache-and-network' });
  const venues = data?.myVenues ?? [];
  const { venue, selectVenue } = useSelectedVenue(venues);
  const option = STUDIO_OPTION_LIST.VENUE.find((item) => item.key === 'rented-items');

  return (
    <VenuePageFrame
      icon={option ? profileIcon(STUDIO_OPTION_ICON[option.icon]) : null}
      title={option ? t(option.labelKey) : ''}
      venues={venues}
      venue={venue}
      onSelect={selectVenue}
      loading={loading && !data}
      error={error}
      noVenuesMessage={t('mweb.studioOptions.noVenuesYet')}
    >
      {venue && (
        <div key={venue.id} data-testid="venue-rented-items">
          <VenueRentalDesk venueId={venue.id} surface="mweb" mode="owner" uploadSurface="MWEB" />
        </div>
      )}
    </VenuePageFrame>
  );
}
