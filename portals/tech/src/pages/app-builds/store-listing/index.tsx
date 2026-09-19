import { useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { formatDateTime } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import StoreListingForm from './store-listing.form';
import { APP_STORE_CATEGORIES, STORE_LISTING, UPDATE_STORE_LISTING } from './queries';
import type { StoreListing, StoreListingValues } from './store-listing.types';

/**
 * Store Listing — what App Store Connect and Google Play ask for when the app
 * is listed, kept once here. Push to App Store applies it to the App Store
 * version before submitting; Push to Google Play production writes it into the
 * same edit that releases the bundle.
 */
export default function StoreListingPage() {
  const { t } = useTranslation();
  const listingQuery = useQuery<{ storeListing: StoreListing }>(STORE_LISTING, {
    fetchPolicy: 'cache-and-network',
  });
  const categoriesQuery = useQuery<{ appStoreCategories: string[] }>(APP_STORE_CATEGORIES);
  const [save, saving] = useMutation<any>(UPDATE_STORE_LISTING);

  const onSubmit = useCallback(
    async (values: StoreListingValues) => {
      try {
        await save({ variables: { input: values } });
        notifySuccess(t('tech.storeListing.saved'));
        await listingQuery.refetch();
      } catch (err) {
        notifyError(parseApiError(err));
      }
    },
    [save, listingQuery, t]
  );

  const listing = listingQuery.data?.storeListing;

  return (
    <Box data-testid="store-listing-page">
      <Stack sx={{ mb: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          {t('tech.storeListing.title')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('tech.storeListing.subtitle')}
        </Typography>
        {listing?.updated_at && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid="store-listing-last-saved">
            {t('tech.storeListing.lastSaved', {
              vars: { by: listing.updated_by, when: formatDateTime(listing.updated_at) },
            })}
          </Typography>
        )}
      </Stack>
      {categoriesQuery.error && <Alert severity="warning" sx={{ mb: 2, maxWidth: 880 }}>{parseApiError(categoriesQuery.error)}</Alert>}
      {listingQuery.error && <Alert severity="error" sx={{ mb: 2, maxWidth: 880 }}>{parseApiError(listingQuery.error)}</Alert>}
      <Card sx={{ maxWidth: 880 }}>
        <CardContent>
          {!listing && !listingQuery.error && <Skeleton height={240} />}
          {listing && (
            <StoreListingForm
              listing={listing}
              categories={categoriesQuery.data?.appStoreCategories ?? []}
              busy={saving.loading}
              onSubmit={onSubmit}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
