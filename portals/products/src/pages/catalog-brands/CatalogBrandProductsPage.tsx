import { useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { useApolloTableFetch } from '@duncit/table';
import { BackHeader } from '@duncit/ui';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import CatalogBrandProductsTable from './CatalogBrandProductsTable';
import {
  ARCHIVE_INVENTORY_PRODUCT,
  CATALOG_BRAND,
  CATALOG_BRAND_PRODUCTS_TABLE,
  DUPLICATE_INVENTORY_PRODUCT,
  RESTORE_INVENTORY_PRODUCT,
  type CatalogBrandProductRow,
} from './queries';

const ARCHIVE_MESSAGE =
  'Archiving hides this product from active lists and the pod product picker. You can restore it here anytime.';
const RESTORE_MESSAGE = 'The product becomes active again and reappears in this brand’s catalogue.';

/**
 * Catalog > Brands > one brand's products. Scoped with ownership=BRAND +
 * brand_id, so PENDING and DENIED listings show alongside approved ones —
 * reviewing those listings stays in Brands & Products Review.
 */
export default function CatalogBrandProductsPage() {
  const { brandId = '' } = useParams<{ brandId: string }>();
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [lifecycleTarget, setLifecycleTarget] = useState<CatalogBrandProductRow | null>(null);

  const brandQuery = useQuery(CATALOG_BRAND, {
    variables: { id: brandId },
    fetchPolicy: 'cache-and-network',
  });
  const [archiveProduct, archiveState] = useMutation(ARCHIVE_INVENTORY_PRODUCT);
  const [restoreProduct, restoreState] = useMutation(RESTORE_INVENTORY_PRODUCT);
  const [duplicateProduct] = useMutation(DUPLICATE_INVENTORY_PRODUCT);

  const productsBase = `/catalog/brands/${brandId}/products`;

  const extraFilters = useMemo(
    () =>
      [
        { field: 'ownership', op: 'eq', value: 'BRAND' },
        { field: 'brand_id', op: 'eq', value: brandId },
      ] as const,
    [brandId],
  );

  const fetchRows = useApolloTableFetch<CatalogBrandProductRow>(
    client,
    CATALOG_BRAND_PRODUCTS_TABLE,
    'inventoryProductsTable',
    { extraFilters },
    [brandId],
  );

  const runLifecycle = async () => {
    /* v8 ignore next -- the dialog only opens once a row has been picked */
    if (!lifecycleTarget) return;
    const restoring = lifecycleTarget.status === 'ARCHIVED';
    try {
      const run = restoring ? restoreProduct : archiveProduct;
      await run({ variables: { id: lifecycleTarget.id } });
      notifySuccess(restoring ? 'Product restored' : 'Product archived');
      refetchRef.current?.();
    } catch (error) {
      notifyError(parseApiError(error, 'Could not update the product'));
    }
    setLifecycleTarget(null);
  };

  const runDuplicate = async (product: CatalogBrandProductRow) => {
    try {
      const res = await duplicateProduct({ variables: { id: product.id } });
      notifySuccess('Product duplicated as a draft copy');
      const newId = res.data?.duplicateInventoryProduct?.id;
      if (newId) navigate(`${productsBase}/${newId}/edit`);
    } catch (error) {
      notifyError(parseApiError(error, 'Could not duplicate the product'));
    }
  };

  const brand = brandQuery.data?.ecommBrand ?? null;
  const restoring = lifecycleTarget?.status === 'ARCHIVED';
  const lifecycleLabel = restoring ? 'Restore' : 'Archive';

  return (
    <Stack spacing={3}>
      <BackHeader
        title={brand?.brand_name ?? 'Brand products'}
        eyebrow="Catalog · Brand products"
        backTo="/catalog/brands"
        backAriaLabel="Back to brands"
        actions={
          <Button
            component={RouterLink}
            to={`/catalog/brands/${brandId}`}
            size="small"
            startIcon={<TuneIcon />}
          >
            Manage brand
          </Button>
        }
      />

      <Typography variant="body2" color="text.secondary">
        Every product this brand owns, including listings still awaiting review. Approving or
        denying a listing stays in Brands &amp; Products Review.
      </Typography>

      {!brandQuery.loading && !brand && (
        <Alert severity="warning">Brand not found — check the link you followed.</Alert>
      )}

      <CatalogBrandProductsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onEdit={(p) => navigate(`${productsBase}/${p.id}/edit`)}
        onLifecycle={setLifecycleTarget}
        onDuplicate={runDuplicate}
      />

      <ConfirmDialog
        open={!!lifecycleTarget}
        title={`${lifecycleLabel} product?`}
        message={restoring ? RESTORE_MESSAGE : ARCHIVE_MESSAGE}
        confirmLabel={lifecycleLabel}
        confirmColor={restoring ? 'success' : 'warning'}
        loading={archiveState.loading || restoreState.loading}
        busyLabel="Working…"
        onClose={() => setLifecycleTarget(null)}
        onConfirm={runLifecycle}
      />
    </Stack>
  );
}
