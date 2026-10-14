import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { partnerPortalUrl } from '@duncit/onboarding';
import { STUDIO_OPTION_LIST } from '@duncit/utils';
import { FOOD_OWNER_VENUES, VenueFoodCoupons, VenueFoodDashboard, VenueFoodOrders } from '@duncit/venue-food';
import { STUDIO_OPTION_ICON } from '../../components/app-header/profile-drawer/studioOptionIcons';
import { profileIcon } from '../../components/app-header/profile-drawer/profileIcons';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';
import { useTranslation } from '../../i18n/useTranslation';
import VenuePageFrame from '../venue-manage-page/VenuePageFrame';

/** The three food desk options this page draws — their catalogue keys. */
export type VenueFoodTool = 'food-dashboard' | 'food-orders' | 'food-coupons';

/** The table-id prefix the food desk's tables remember their columns under on mWeb. */
const SURFACE = 'mweb';

const TOOLS: Readonly<Record<VenueFoodTool, { noFoodKey: string; render: (venueId: string) => ReactNode }>> = {
  'food-dashboard': {
    noFoodKey: 'venueFoodOwner.dashboard.noFood',
    render: (venueId) => <VenueFoodDashboard venueId={venueId} logger={logs.mWeb} />,
  },
  'food-orders': {
    noFoodKey: 'venueFoodOwner.orders.noFood',
    render: (venueId) => <VenueFoodOrders venueId={venueId} surface={SURFACE} />,
  },
  'food-coupons': {
    noFoodKey: 'venueFoodOwner.coupons.noFood',
    render: (venueId) => <VenueFoodCoupons venueId={venueId} surface={SURFACE} />,
  },
};

/**
 * Venue Options → Food Dashboard / Food Orders / Food Coupons for the selected
 * venue — the same tools the Partners console and the Venues console mount
 * (@duncit/venue-food). A venue that serves no food has nothing here; it gets
 * the way to switch food on in its venue form, which lives in the Partner
 * console.
 */
export default function VenueFoodPage({ tool }: Readonly<{ tool: VenueFoodTool }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(FOOD_OWNER_VENUES, { fetchPolicy: 'cache-and-network' });
  const venues = data?.myVenues ?? [];
  const { venue, selectVenue } = useSelectedVenue(venues);
  const option = STUDIO_OPTION_LIST.VENUE.find((item) => item.key === tool);
  const { noFoodKey, render } = TOOLS[tool];

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
      {venue?.offers_food ? (
        <div key={venue.id} data-testid={`venue-${tool}`}>
          {render(venue.id)}
        </div>
      ) : (
        <Alert
          severity="info"
          data-testid={`venue-${tool}-no-food`}
          action={
            <DuncitButton
              size="small"
              color="inherit"
              href={partnerPortalUrl(`/register-venue/${venue?.id ?? ''}?selectedtab=food`)}
            >
              {t('venueFoodOwner.common.editVenue')}
            </DuncitButton>
          }
        >
          {t(noFoodKey)}
        </Alert>
      )}
    </VenuePageFrame>
  );
}
