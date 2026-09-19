import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { BackHeader, QueryGuard } from '@duncit/ui';
import { ProductStatusChip } from '../../../components/chips';
import ViewOnStoreButton from '../../../components/ViewOnStoreButton';
import { storeLinks } from '../../../lib/store-links';
import { STORE_PRODUCT, type StoreProduct } from '../queries';
import ProductActions from './ProductActions';
import ProductForm, { type SubmitAs } from './product-form';
import { useSaveProduct } from './useSaveProduct';

/** Its status, and a way to see it on the store once it is on sale. */
function HeaderActions({ product }: Readonly<{ product: StoreProduct }>) {
  const onSale = product.status === 'PUBLISHED' && product.slug !== '';
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <ProductStatusChip status={product.status} />
      {onSale && <ViewOnStoreButton href={storeLinks.product(product.slug)} />}
    </Stack>
  );
}

/**
 * One store product, created (`/products/new`) or edited (`/products/:id`) on
 * a page of its own. A new product becomes a draft or goes straight on sale;
 * a saved one moves between draft, published and archived from the action bar.
 */
export default function ProductEditorPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useQuery(STORE_PRODUCT, {
    variables: { id: id ?? '' },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const product = data?.storeAdminProduct ?? null;
  const save = useSaveProduct(id ?? null);
  const renderActions = (submitAs: SubmitAs) => <ProductActions status={product?.status ?? null} submitAs={submitAs} />;

  return (
    <Stack spacing={3} data-testid="product-editor-page">
      <BackHeader
        title={product ? product.title || product.product_name : t('ecommPortal.productEditor.newTitle')}
        eyebrow={product?.sku || t('ecommPortal.nav.products')}
        backTo="/products"
        backAriaLabel={t('ecommPortal.common.backTo', { vars: { name: t('ecommPortal.nav.products') } })}
        actions={product && <HeaderActions product={product} />}
      />
      {id ? (
        <QueryGuard loading={loading && !product} error={error} notFound={!loading && !product} notFoundText={t('ecommPortal.common.notFound')}>
          {() => product && <ProductForm key={product.id} initial={product} onSave={save} renderActions={renderActions} />}
        </QueryGuard>
      ) : (
        <ProductForm key="new" initial={null} onSave={save} renderActions={renderActions} />
      )}
    </Stack>
  );
}
