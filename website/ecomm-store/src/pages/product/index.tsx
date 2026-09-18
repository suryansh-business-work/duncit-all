import { useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Stack } from '@mui/material';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

import { STORE_PRODUCT, RECORD_VIEW, type StoreProduct } from '../../graphql/product';
import { logFailure } from '../../lib/log';
import { paths } from '../../lib/paths';
import { rememberViewed } from '../../lib/recentlyViewed';
import { firstFilled } from '../../lib/text';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { NotFoundContent } from '../info/NotFoundPage';
import { ShelfHeading } from '../shelf/ShelfHeading';
import { BuyBox } from './buy-box';
import { RecentlyViewed, RelatedProducts } from './MoreProducts';
import { ProductDetails } from './ProductDetails';
import { ProductGallery } from './ProductGallery';
import { ProductReviews } from './reviews';
import { ProductTitleBlock } from './ProductTitleBlock';
import { useVariantSelection } from './useVariantSelection';
import { VariantPicker } from './VariantPicker';

/** Photos for the chosen variant first, then the product's own, without repeats. */
const galleryFor = (product: StoreProduct, variantImages: string[]): string[] => {
  const all = [...variantImages, ...product.images, product.image_url].filter(Boolean);
  return [...new Set(all)];
};

function ProductView({ product }: Readonly<{ product: StoreProduct }>) {
  const selection = useVariantSelection(product);
  const images = galleryFor(product, selection.variant?.images ?? []);
  const crumbs = product.breadcrumbs.map((b) => ({ label: b.name, to: paths.category(b.slug) }));
  const picker = product.has_variants ? (
    <VariantPicker options={product.options} selection={selection.selection} stateOf={selection.stateOf} onChoose={selection.choose} />
  ) : null;
  return (
    <Stack spacing={{ xs: 3, md: 5 }}>
      {crumbs.length > 0 ? <ShelfHeading title={product.title} crumbs={crumbs} breadcrumbsOnly /> : null}
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, md: 5 },
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gridTemplateAreas: { xs: '"title" "gallery" "buy"', md: '"gallery title" "gallery buy"' },
        }}
      >
        <Box sx={{ gridArea: 'title' }}>
          <ProductTitleBlock product={product} />
        </Box>
        <Box sx={{ gridArea: 'gallery', position: { md: 'sticky' }, top: { md: 180 } }}>
          <ProductGallery images={images} title={product.title} />
        </Box>
        <Box sx={{ gridArea: 'buy' }}>
          <BuyBox product={product} variant={selection.variant} picker={picker} />
        </Box>
      </Box>
      <ProductDetails product={product} />
      <ProductReviews product={product} />
      <RelatedProducts productId={product.id} />
      <RecentlyViewed currentId={product.id} />
    </Stack>
  );
}

/** /p/:slug — one product, counted as viewed once per visit. */
export function ProductPage() {
  const { t } = useStoreT();
  const { slug = '' } = useParams();
  const { data, loading, error } = useQuery(STORE_PRODUCT, { variables: { slug } });
  const [recordView] = useMutation(RECORD_VIEW);
  const product = data?.storeProduct;
  const recorded = useRef('');
  usePageSeo(firstFilled(product?.seo_title, product?.title), firstFilled(product?.seo_description, product?.short_description));

  useEffect(() => {
    if (!product || recorded.current === product.id) return;
    recorded.current = product.id;
    rememberViewed(product.id);
    recordView({ variables: { product_id: product.id } }).catch(logFailure('product', 'recordView'));
  }, [product, recordView]);

  if (loading && !product) return <Loader label={t('ecommStore.common.loading')} />;
  if (error) return <Alert severity="error">{parseApiError(error, t('ecommStore.common.loadFailed'))}</Alert>;
  if (!product) return <NotFoundContent />;
  return <ProductView key={product.id} product={product} />;
}
