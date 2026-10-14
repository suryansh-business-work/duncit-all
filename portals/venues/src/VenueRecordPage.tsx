import { useCallback } from 'react';
import { VenueDetailsPage, type AdminVenueDetail, type VenueDetailsExtraTab } from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { VenueFoodCoupons, VenueFoodDashboard, VenueFoodOrders } from '@duncit/venue-food';

/** The table-id prefix the food desk's tables remember their columns under in this console. */
const SURFACE = 'venues';

/**
 * Venues → one venue, with the venue's food desk — its Food Dashboard, order
 * board and coupons, the same tools the owner has in the Partners console and
 * mWeb (@duncit/venue-food). They are tabs of the record, selected through the
 * URL like the record's own, and only for a venue that serves food: one that
 * does not has no orders, numbers or coupons to work.
 */
export default function VenueRecordPage() {
  const { t } = useTranslation();
  const foodTabs = useCallback(
    (venue: AdminVenueDetail): VenueDetailsExtraTab[] =>
      venue.offers_food
        ? [
            {
              value: 'foodDashboard',
              label: t('venueFoodOwner.dashboard.title'),
              render: () => <VenueFoodDashboard key={venue.id} venueId={venue.id} logger={logs.portal.venues} />,
            },
            {
              value: 'foodOrders',
              label: t('venueFoodOwner.orders.title'),
              render: () => <VenueFoodOrders key={venue.id} venueId={venue.id} surface={SURFACE} />,
            },
            {
              value: 'foodCoupons',
              label: t('venueFoodOwner.coupons.title'),
              render: () => <VenueFoodCoupons key={venue.id} venueId={venue.id} surface={SURFACE} />,
            },
          ]
        : [],
    [t],
  );
  return <VenueDetailsPage extraTabs={foodTabs} />;
}
