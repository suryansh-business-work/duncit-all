import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { parseApiError } from '@duncit/utils';
import { QuantityCell, renderListingStatus } from '../ProductListingCells';
import ProductRowActions, { type ProductRowAction } from '../ProductRowActions';
import ListingPauseDialog from '../ListingPauseDialog';
import RunAdDialog, { type AdKind } from '../RunAdDialog';
import {
  MY_PRODUCT_LISTINGS_TABLE,
  UPDATE_QUANTITY,
  type ProductListingRow,
} from '../queries';
import { useTranslation } from '@duncit/shell';
import { DeletionStateChip } from '../../ecomm-brand-page/deletion-request';
import { buildListingColumns, getProductRowId, isLowStock } from './columns';
import { useProductDeletion } from './useProductDeletion';

interface Props {
  brandId: string;
  canManageProducts?: boolean;
  onEdit: (product: ProductListingRow) => void;
  onView?: (product: ProductListingRow) => void;
  onSettings?: (product: ProductListingRow) => void;
}

export default function ProductListingsTable({ brandId, canManageProducts = false, onEdit, onView, onSettings }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [updateQuantity, quantityState] = useMutation<unknown>(UPDATE_QUANTITY);
  const [pauseTarget, setPauseTarget] = useState<ProductListingRow | null>(null);
  const [adTarget, setAdTarget] = useState<{ product: ProductListingRow; kind: AdKind } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const refetch = useCallback(() => refetchRef.current?.(), []);
  const deletion = useProductDeletion({ brandId, onMessage: setMessage, refetch });
  const { openFor, startDelete, startWithdraw } = deletion;

  const fetchRows = useApolloTableFetch<ProductListingRow>(
    client,
    MY_PRODUCT_LISTINGS_TABLE,
    'myProductListingsTable',
    { extraVariables: { brand_id: brandId } },
    [brandId],
  );

  const saveQuantity = useCallback(
    async (product: ProductListingRow, quantity: number) => {
      setMessage(null);
      try {
        await updateQuantity({ variables: { product_doc_id: product.id, inventory_count: quantity } });
        setMessage(t('partners.listProductsPage.quantityUpdated'));
        refetchRef.current?.();
      } catch (updateError) {
        setMessage(parseApiError(updateError));
      }
    },
    [updateQuantity],
  );

  const columns = useMemo<DuncitColumn<ProductListingRow>[]>(() => {
    const quantityDisabled = !canManageProducts || quantityState.loading;
    const renderQuantity = (product: ProductListingRow) => (
      <QuantityCell product={product} disabled={quantityDisabled} onSave={saveQuantity} />
    );
    const renderStatus = (product: ProductListingRow) => {
      const request = openFor('PRODUCT', product.id);
      return (
        <Stack direction="row" spacing={0.5} component="span" sx={{ flexWrap: 'wrap' }}>
          {renderListingStatus(product)}
          {request && <DeletionStateChip request={request} />}
        </Stack>
      );
    };
    // An open deletion request replaces Delete with Withdraw (a brand request's products are withdrawn with the brand).
    const removalAction = (product: ProductListingRow): ProductRowAction => {
      const request = openFor('PRODUCT', product.id);
      if (!request) {
        return { key: 'delete', label: t('shell.common.delete'), icon: 'delete', danger: true, disabled: !canManageProducts, onClick: () => startDelete(product) };
      }
      return { key: 'withdraw-deletion', label: t('partners.deletionRequest.withdrawAction'), icon: 'restore', disabled: !canManageProducts || Boolean(request.parent_id), onClick: () => startWithdraw(product) };
    };
    const renderActions = (product: ProductListingRow) => {
      const paused = product.is_active === false;
      const canPause = canManageProducts && product.listing_review_status === 'APPROVED' && product.status !== 'ARCHIVED';
      return (
        <ProductRowActions
          actions={[
            { key: 'edit', label: t('shell.common.edit'), icon: 'edit', disabled: !canManageProducts, onClick: () => onEdit(product) },
            { key: 'settings', label: t('shell.nav.settings'), icon: 'settings', disabled: !canManageProducts, onClick: () => onSettings?.(product) },
            { key: 'toggle-active', label: paused ? 'Reactivate' : 'Temporarily deactivate', icon: paused ? 'resume' : 'pause', disabled: !canPause, onClick: () => setPauseTarget(product) },
            { key: 'product-ad', label: t('partners.listProductsPage.runProductAd'), icon: 'ad', disabled: !canManageProducts, onClick: () => setAdTarget({ product, kind: 'PRODUCT_AD' }) },
            { key: 'brand-ad', label: t('partners.listProductsPage.runBrandAd'), icon: 'ad', disabled: !canManageProducts, onClick: () => setAdTarget({ product, kind: 'BRAND_AD' }) },
            removalAction(product),
          ]}
        />
      );
    };
    return buildListingColumns(t, renderQuantity, renderActions, renderStatus);
  }, [canManageProducts, quantityState.loading, saveQuantity, onEdit, onSettings, openFor, startDelete, startWithdraw]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6" component="h2" sx={{
            fontWeight: 950
          }}>{t('partners.listProductsPage.yourListedProducts')}</Typography>
          {message && (
            <Alert severity={/deleted|updated|submitted/.test(message) ? 'success' : 'error'}>{message}</Alert>
          )}
          <DuncitTable<ProductListingRow>
            tableId="partners-app-product-listings"
            ariaLabel={t('partners.listProductsPage.yourListedProducts')}
            columns={columns}
            fetchRows={fetchRows}
            getRowId={getProductRowId}
            onRowClick={onView}
            getRowStyle={(product) => (isLowStock(product) ? { backgroundColor: alpha(theme.palette.warning.main, 0.1) } : undefined)}
            emptyText={t('partners.listProductsPage.noProductListingsYet')}
            defaultSort={{ field: 'updated_at', dir: 'desc' }}
            searchPlaceholder="Search product, size, color"
            refetchRef={refetchRef}
          />
        </Stack>
      </CardContent>
      {deletion.dialogs}
      <ListingPauseDialog target={pauseTarget} onClose={() => setPauseTarget(null)} onDone={(text) => { setMessage(text); refetchRef.current?.(); }} />
      <RunAdDialog
        product={adTarget?.product ?? null}
        adKind={adTarget?.kind ?? 'PRODUCT_AD'}
        open={Boolean(adTarget)}
        onClose={() => setAdTarget(null)}
        onSubmitted={(traceId) => {
          setAdTarget(null);
          const traceSuffix = traceId ? ` · ${traceId}` : '';
          setMessage(`Ad request submitted${traceSuffix}. Marketing will review it.`);
        }}
      />
    </Card>
  );
}
