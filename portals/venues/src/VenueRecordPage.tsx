import { useCallback } from 'react';
import { Link as RouterLink } from 'react-router';
import { VenueDetailsPage, type AdminVenueDetail, type VenueDetailsExtraTab } from '@duncit/entity-consoles';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import {
  VenueFoodCoupons,
  VenueFoodDashboard,
  VenueFoodMenu,
  VenueFoodOrders,
  type FoodAccountMode,
} from '@duncit/venue-food';

/** The table-id prefix the food desk's tables remember their columns under in this console. */
const SURFACE = 'venues';

/** The Razorpay account guests pay is the owner's own — the console shows whether there is one and never sends it. */
const OWNER_ACCOUNT: FoodAccountMode = { kind: 'status' };

/**
 * Venues → one venue, with the venue's food tools — its Food Menu, and for a
 * venue that serves food its Food Dashboard, order board and coupons: the same
 * tools the owner has in the Partners console and mWeb (@duncit/venue-food).
 * They are tabs of the record, selected through the URL like the record's own.
 * The menu tab is there for every venue, because it is where food is switched
 * on; an editor may also change the GST number on the food invoices there.
 */
export default function VenueRecordPage() {
  const { t } = useTranslation();
  const foodTabs = useCallback(
    (venue: AdminVenueDetail): VenueDetailsExtraTab[] => [
      {
        value: 'foodMenu',
        label: t('venueFoodOwner.menu.title'),
        render: () => (
          <VenueFoodMenu
            key={venue.id}
            venueId={venue.id}
            surface={SURFACE}
            mode="admin"
            account={OWNER_ACCOUNT}
            logger={logs.portal.venues}
            notApprovedAction={
              <DuncitButton size="small" color="inherit" component={RouterLink} to={`/venues/${venue.id}/edit`}>
                {t('venueFoodOwner.common.editVenue')}
              </DuncitButton>
            }
          />
        ),
      },
      ...(venue.offers_food
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
        : []),
    ],
    [t],
  );
  return <VenueDetailsPage extraTabs={foodTabs} />;
}
