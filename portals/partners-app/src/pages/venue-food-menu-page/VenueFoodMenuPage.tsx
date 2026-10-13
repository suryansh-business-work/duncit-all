import { useQuery } from '@apollo/client/react';
import { Link as RouterLink } from 'react-router';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import StudioPageHeader from '../../components/studio/StudioPageHeader';
import VenueStudioBody from '../../components/venue/VenueStudioBody';
import { FOOD_ORDER_VENUES } from '../venue-food-orders-page/queries';
import VenueFoodMenuEditor from './VenueFoodMenuEditor';

/** The venue status whose food menu is edited here; before it, the venue form owns the menu. */
const APPROVED = 'APPROVED';

/**
 * Food Menu — the selected venue's dishes and its online ordering, on a page of
 * their own. It is the venue form's Food Menu section and nothing else, so a
 * menu change does not mean opening the whole form. A venue still on its way to
 * approval edits its menu in that form, where the rest of the application is.
 */
export default function VenueFoodMenuPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(FOOD_ORDER_VENUES, { fetchPolicy: 'cache-and-network' });
  const errorAlert = error ? (
    <Alert severity="error" data-testid="venue-food-menu-error">
      {parseApiError(error)}
    </Alert>
  ) : null;

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid="venue-food-menu-page">
      <StudioPageHeader title={t('mweb.studioOptions.foodMenu')} hint={t('mweb.studioOptions.foodMenuHint')} />
      <VenueStudioBody venues={data?.myVenues} loading={loading} errorAlert={errorAlert}>
        {(venue) =>
          venue.status === APPROVED ? (
            <VenueFoodMenuEditor key={venue.id} venueId={venue.id} />
          ) : (
            <Alert
              severity="info"
              data-testid="venue-food-menu-not-approved"
              action={
                <DuncitButton
                  size="small"
                  color="inherit"
                  component={RouterLink}
                  to={`/register-venue/${venue.id}?selectedtab=food`}
                  data-testid="venue-food-menu-open-form"
                >
                  {t('partners.foodMenu.openVenueForm')}
                </DuncitButton>
              }
            >
              {t('partners.foodMenu.notApproved')}
            </Alert>
          )
        }
      </VenueStudioBody>
    </Stack>
  );
}
