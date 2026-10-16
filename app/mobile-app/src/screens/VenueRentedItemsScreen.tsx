import { FoodDeskFrame } from '@/components/venue-food-desk/FoodDeskFrame';
import { VenueRentalsBody } from '@/components/venue-rentals-desk/VenueRentalsBody';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Venue Options → Rented Items (/venues/rented-items): the selected venue's
 * rental numbers, items and bookings — the Tamagui twin of the desk the
 * Partners console, the Venues console and mWeb mount from
 * @duncit/venue-rentals. Every venue can list items, so there is no
 * "switch it on" stop: the desk shows for each one.
 */
export function VenueRentedItemsScreen() {
  const { t } = useTranslation();
  return (
    <FoodDeskFrame title={t('mweb.studioOptions.rentedItems')} testID="venue-rented-items-screen">
      {(venueId) => <VenueRentalsBody venueId={venueId} />}
    </FoodDeskFrame>
  );
}
