import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Link as RouterLink } from 'react-router';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { FOOD_OWNER_VENUES, VenueFoodMenu } from '@duncit/venue-food';
import StudioPageHeader from '../../components/studio/StudioPageHeader';
import VenueStudioBody from '../../components/venue/VenueStudioBody';
import { partnersFoodAccount } from '../register-venue-page/sections/food/AddRazorpayAccount';

/** The table-id and test-id prefix of this console's food tools. */
const SURFACE = 'partners-app';

/**
 * Food Menu — the selected venue's dishes, its online ordering and the GST
 * number on its food invoices, on a page of their own. The editor is
 * @duncit/venue-food's, the same one the Venues console and mWeb mount (and
 * the venue form's Food section is built from its fields); here the owner also
 * picks — or adds — the Razorpay account guests pay. A venue still on its way
 * to approval sets its menu up on Food > Food Settings.
 */
export default function VenueFoodMenuPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(FOOD_OWNER_VENUES, { fetchPolicy: 'cache-and-network' });
  const account = useMemo(() => partnersFoodAccount(`${SURFACE}-venue-food-menu`), []);
  const errorAlert = error ? (
    <Alert severity="error" data-testid="venue-food-menu-error">
      {parseApiError(error)}
    </Alert>
  ) : null;

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid="venue-food-menu-page">
      <StudioPageHeader title={t('mweb.studioOptions.foodMenu')} hint={t('mweb.studioOptions.foodMenuHint')} />
      <VenueStudioBody venues={data?.myVenues} loading={loading} errorAlert={errorAlert}>
        {(venue) => (
          <VenueFoodMenu
            key={venue.id}
            venueId={venue.id}
            surface={SURFACE}
            mode="owner"
            account={account}
            logger={logs.portal['partners-app']}
            // The venue list says whether each venue serves food — the other food pages read it.
            onSaved={() => fireAndForget(refetch(), logs.portal['partners-app'], 'venue-food-menu', 'refetchVenues')}
            notApprovedAction={
              <DuncitButton
                size="small"
                color="inherit"
                component={RouterLink}
                to="/venues/food-settings"
                data-testid="venue-food-menu-open-form"
              >
                {t('venueFoodOwner.common.editVenue')}
              </DuncitButton>
            }
          />
        )}
      </VenueStudioBody>
    </Stack>
  );
}
