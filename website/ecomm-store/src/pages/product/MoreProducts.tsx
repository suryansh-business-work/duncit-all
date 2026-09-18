import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box } from '@mui/material';

import { ProductSlider } from '../../components/ProductSlider';
import { SectionHeading } from '../../components/SectionHeading';
import { STORE_PRODUCTS_BY_IDS, STORE_RELATED } from '../../graphql/catalog';
import { readRecentlyViewed } from '../../lib/recentlyViewed';
import { useStoreT } from '../../i18n';

/** "You may also like" — the server's related picks for this product. */
export function RelatedProducts({ productId }: Readonly<{ productId: string }>) {
  const { t } = useStoreT();
  const { data } = useQuery(STORE_RELATED, { variables: { product_id: productId, limit: 12 } });
  const products = data?.storeRelatedProducts ?? [];
  if (products.length === 0) return null;
  const title = t('ecommStore.product.related');
  return (
    <Box component="section" aria-label={title}>
      <SectionHeading title={title} />
      <ProductSlider products={products} label={title} />
    </Box>
  );
}

/** What this browser looked at before, minus the product on screen. */
export function RecentlyViewed({ currentId }: Readonly<{ currentId: string }>) {
  const { t } = useStoreT();
  const ids = useMemo(() => readRecentlyViewed().filter((id) => id !== currentId), [currentId]);
  const { data } = useQuery(STORE_PRODUCTS_BY_IDS, { variables: { ids }, skip: ids.length === 0 });
  const products = data?.storeProductsByIds ?? [];
  if (products.length === 0) return null;
  const title = t('ecommStore.product.recentlyViewed');
  return (
    <Box component="section" aria-label={title}>
      <SectionHeading title={title} />
      <ProductSlider products={products} label={title} />
    </Box>
  );
}
