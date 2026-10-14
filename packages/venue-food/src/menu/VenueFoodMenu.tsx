import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, CircularProgress, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, type LevelFns } from '@duncit/logs';
import type { UploadSurface } from '@duncit/media-picker';
import { isFoodMenuEditable, parseApiError, type FoodMenuMode, type FoodMenuVenue } from '@duncit/utils';
import { ADMIN_FOOD_MENU, FOOD_MENU_CONFIG, OWNER_FOOD_MENU } from '../documents';
import type { FoodAccountMode } from './fields/FoodOrderingFields';
import { FoodMenuForm } from './food-menu';

export interface VenueFoodMenuProps {
  /** The venue whose menu this is — venue selection stays with the host page. */
  venueId: string;
  /** The mounting surface (`partners-app`, `venues`, `mweb`) — roots the test ids. */
  surface: string;
  /** The owner (reads `myVenue`) or a Venues console editor (reads `venue`, may change the GST number). */
  mode: FoodMenuMode;
  /** How this surface handles the Razorpay account guests pay. */
  account: FoodAccountMode;
  /** The Upload Settings surface dish photos are capped and compressed for. */
  uploadSurface?: UploadSurface;
  /** The mounting surface's logger; a failed retry is filed against it. */
  logger: LevelFns;
  /** What to offer on a venue that is not approved yet — its menu lives in the venue form until then. */
  notApprovedAction?: ReactNode;
  /** The server's copy after a save — a host whose venue list shows "serves food" refreshes it. */
  onSaved?: (venue: FoodMenuVenue) => void;
}

/**
 * A venue's food menu editor — the dishes, QR ordering with its discount and
 * GST, and the invoice GST number — as ONE MUI tool the Partners console, the
 * Venues console and mWeb all mount. It reads the venue and the menu's caps,
 * and saves through `updateApprovedVenue`.
 */
export default function VenueFoodMenu({
  venueId,
  surface,
  mode,
  account,
  uploadSurface = 'PORTALS',
  logger,
  notApprovedAction,
  onSaved,
}: Readonly<VenueFoodMenuProps>) {
  const { t } = useTranslation();
  const variables = { venue_id: venueId };
  const owner = useQuery(OWNER_FOOD_MENU, { variables, skip: mode !== 'owner', fetchPolicy: 'cache-and-network' });
  const admin = useQuery(ADMIN_FOOD_MENU, { variables, skip: mode !== 'admin', fetchPolicy: 'cache-and-network' });
  const configQuery = useQuery(FOOD_MENU_CONFIG);
  const venueQuery = mode === 'admin' ? admin : owner;
  const venue = mode === 'admin' ? admin.data?.venue : owner.data?.myVenue;
  const config = configQuery.data?.venueRegistrationConfig;
  const failure = venueQuery.error ?? configQuery.error;
  const idPrefix = `${surface}-venue-food-menu`;

  if ((venueQuery.loading && !venueQuery.data) || (configQuery.loading && !config)) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} aria-label={t('venueFoodOwner.common.loading')} />
      </Stack>
    );
  }
  // The caps and the diet and spice choices come from the config, so without
  // it (or the venue) there is no form to draw — say so, and offer the read again.
  if (failure || !config || !venue) {
    const retry = () => {
      fireAndForget(venueQuery.refetch(), logger, 'venue-food-menu', 'refetchVenue');
      fireAndForget(configQuery.refetch(), logger, 'venue-food-menu', 'refetchConfig');
    };
    return (
      <Alert
        severity="error"
        data-testid={`${idPrefix}-load-error`}
        action={
          <DuncitButton size="small" color="inherit" onClick={retry} data-testid={`${idPrefix}-retry`}>
            {t('venueFoodOwner.common.retry')}
          </DuncitButton>
        }
      >
        {failure ? parseApiError(failure) : t('venueFoodOwner.menu.loadFailed')}
      </Alert>
    );
  }
  if (!isFoodMenuEditable(venue)) {
    return (
      <Alert severity="info" data-testid={`${idPrefix}-not-approved`} action={notApprovedAction}>
        {t('venueFoodOwner.menu.notApproved')}
      </Alert>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <FoodMenuForm
          key={venue.id}
          venue={venue}
          config={config}
          mode={mode}
          account={account}
          upload={{ venueId: venue.id, surface: uploadSurface }}
          idPrefix={idPrefix}
          onSaved={onSaved}
        />
      </CardContent>
    </Card>
  );
}
