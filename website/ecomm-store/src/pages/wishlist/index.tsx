import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';

import { useCart } from '../../app/providers/CartProvider';
import { EmptyState } from '../../components/EmptyState';
import { ProductGrid } from '../../components/ProductGrid';
import { STORE_WISHLIST } from '../../graphql/catalog';
import { paths } from '../../lib/paths';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';

/** /wishlist — saved products; a guest's live in this browser's cart token. */
export function WishlistPage() {
  const { t } = useStoreT();
  const { cartToken } = useCart();
  usePageSeo(t('ecommStore.account.wishlist'));
  const { data, loading } = useQuery(STORE_WISHLIST, { variables: { cart_token: cartToken }, fetchPolicy: 'cache-and-network' });
  const products = data?.storeWishlist ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h1">{t('ecommStore.account.wishlist')}</Typography>
      {loading && products.length === 0 ? <Loader label={t('ecommStore.common.loading')} /> : null}
      {!loading && products.length === 0 ? (
        <EmptyState
          icon={<FavoriteBorderRoundedIcon />}
          title={t('ecommStore.wishlist.emptyTitle')}
          body={t('ecommStore.wishlist.emptyBody')}
          action={
            <DuncitButton component={RouterLink} to={paths.shop} variant="contained">
              {t('ecommStore.cart.startShopping')}
            </DuncitButton>
          }
        />
      ) : null}
      <ProductGrid products={products} />
    </Stack>
  );
}
