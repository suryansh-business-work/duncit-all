import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { partnerPortalUrl } from '@duncit/onboarding';
import { STUDIO_OPTION_LIST } from '@duncit/utils';
import {
  FOOD_OWNER_VENUES,
  VenueFoodCoupons,
  VenueFoodDashboard,
  VenueFoodMenu,
  VenueFoodOrders,
  type FoodAccountMode,
} from '@duncit/venue-food';
import { STUDIO_OPTION_ICON } from '../../components/app-header/profile-drawer/studioOptionIcons';
import { profileIcon } from '../../components/app-header/profile-drawer/profileIcons';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';
import { useTranslation } from '../../i18n/useTranslation';
import VenuePageFrame from '../venue-manage-page/VenuePageFrame';

/** The four food desk options this page draws — their catalogue keys. */
export type VenueFoodTool = 'food-dashboard' | 'food-menu' | 'food-orders' | 'food-coupons';

/** The table-id prefix the food desk's tables remember their columns under on mWeb. */
const SURFACE = 'mweb';

/** The venue form's Food section, in the Partner console — where food is switched on before approval. */
const venueFormUrl = (venueId: string) => partnerPortalUrl(`/register-venue/${venueId}?selectedtab=food`);

/** The owner picks a saved Razorpay account here; a new one is added on the Partner console's Food Menu page. */
const MWEB_ACCOUNT: FoodAccountMode = {
  kind: 'picker',
  addAccount: () => <AddAccountLink />,
};

function AddAccountLink() {
  const { t } = useTranslation();
  return (
    <DuncitButton
      variant="outlined"
      href={partnerPortalUrl('/venues/food-menu')}
      target="_blank"
      rel="noopener noreferrer"
      endIcon={<OpenInNewIcon fontSize="small" />}
      sx={{ flexShrink: 0 }}
    >
      {t('venueFoodOwner.menu.addAccount')}
    </DuncitButton>
  );
}

interface ToolEntry {
  /** What the venue misses while food is off; absent for the menu, which is where food is switched on. */
  noFoodKey?: string;
  render: (venueId: string, editVenue: ReactNode) => ReactNode;
}

const TOOLS: Readonly<Record<VenueFoodTool, ToolEntry>> = {
  'food-dashboard': {
    noFoodKey: 'venueFoodOwner.dashboard.noFood',
    render: (venueId) => <VenueFoodDashboard venueId={venueId} logger={logs.mWeb} />,
  },
  'food-menu': {
    render: (venueId, editVenue) => (
      <VenueFoodMenu
        venueId={venueId}
        surface={SURFACE}
        mode="owner"
        account={MWEB_ACCOUNT}
        uploadSurface="MWEB"
        logger={logs.mWeb}
        notApprovedAction={editVenue}
      />
    ),
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
 * Venue Options → Food Dashboard / Food Menu / Food Orders / Food Coupons for
 * the selected venue — the same tools the Partners console and the Venues
 * console mount (@duncit/venue-food). A venue that serves no food has nothing
 * on the dashboard, orders or coupons; it gets the way to switch food on — the
 * Food Menu, or before approval the venue form in the Partner console.
 */
export default function VenueFoodPage({ tool }: Readonly<{ tool: VenueFoodTool }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(FOOD_OWNER_VENUES, { fetchPolicy: 'cache-and-network' });
  const venues = data?.myVenues ?? [];
  const { venue, selectVenue } = useSelectedVenue(venues);
  const option = STUDIO_OPTION_LIST.VENUE.find((item) => item.key === tool);
  const { noFoodKey, render } = TOOLS[tool];
  const editVenue = (
    <DuncitButton size="small" color="inherit" href={venueFormUrl(venue?.id ?? '')}>
      {t('venueFoodOwner.common.editVenue')}
    </DuncitButton>
  );

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
      {venue && (venue.offers_food || !noFoodKey) ? (
        <div key={venue.id} data-testid={`venue-${tool}`}>
          {render(venue.id, editVenue)}
        </div>
      ) : (
        <Alert severity="info" data-testid={`venue-${tool}-no-food`} action={editVenue}>
          {noFoodKey ? t(noFoodKey) : null}
        </Alert>
      )}
    </VenuePageFrame>
  );
}
