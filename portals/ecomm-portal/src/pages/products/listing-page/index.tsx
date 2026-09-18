import { useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Box, Grid, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { BackHeader, QueryGuard } from '@duncit/ui';
import { FlagChip } from '../../../components/chips';
import ViewOnStoreButton from '../../../components/ViewOnStoreButton';
import { runAction } from '../../../lib/actions';
import { storeLinks } from '../../../lib/store-links';
import { SAVE_LISTING, STORE_LISTING } from '../queries';
import ListingForm, { type toListingInput } from './listing-form';
import ProductFacts from './ProductFacts';

const FORM_ID = 'listing-form';

/** One product's listing on the store (`/products/:id`), beside the catalogue's facts about it. */
export default function ListingPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const { data, loading, error } = useQuery(STORE_LISTING, { variables: { product_id: id }, fetchPolicy: 'cache-and-network' });
  const [save, saveState] = useMutation(SAVE_LISTING);
  const listing = data?.storeListing;

  const submit = async (input: ReturnType<typeof toListingInput>) => {
    await runAction(() => save({ variables: { product_id: id, input } }), t('ecommPortal.common.saved'));
  };

  const actions = listing && (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <FlagChip on={listing.listed} onLabel={t('ecommPortal.products.onStore')} offLabel={t('ecommPortal.products.offStore')} />
      {listing.listed && listing.slug && <ViewOnStoreButton href={storeLinks.product(listing.slug)} />}
      <DuncitButton type="submit" form={FORM_ID} variant="contained" startIcon={<SaveIcon />} loading={saveState.loading}>
        {t('shell.common.save')}
      </DuncitButton>
    </Stack>
  );

  return (
    <Stack spacing={3}>
      <BackHeader
        title={listing ? listing.title || listing.product_name : t('ecommPortal.common.product')}
        eyebrow={listing?.sku}
        backTo="/products"
        backAriaLabel={t('ecommPortal.common.backTo', { vars: { name: t('ecommPortal.nav.products') } })}
        actions={actions}
      />
      <QueryGuard loading={loading && !listing} error={error} notFound={!loading && !listing} notFoundText={t('ecommPortal.common.notFound')}>
        {() =>
          listing && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 8 }}>
                <ListingForm key={listing.id} formId={FORM_ID} listing={listing} onSubmit={submit} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
                  <ProductFacts listing={listing} />
                </Box>
              </Grid>
            </Grid>
          )
        }
      </QueryGuard>
    </Stack>
  );
}
