import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import {
  Alert,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { parseApiError } from '@duncit/utils';
import { QuantityCell, renderListingStatus, renderProduct } from './ProductListingCells';
import ProductRowActions from './ProductRowActions';
import ListingPauseDialog from './ListingPauseDialog';
import RunAdDialog, { type AdKind } from './RunAdDialog';
import {
  DELETE_LISTING,
  MY_PRODUCT_LISTINGS_TABLE,
  UPDATE_QUANTITY,
  type ProductListingRow,
} from './queries';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

/** Available stock at/below the product's low-stock threshold (opt-in per product). */
const isLowStock = (product: ProductListingRow) =>
  Boolean(product.notify_low_stock) &&
  Number(product.available_count ?? product.inventory_count ?? 0) <= Number(product.low_stock_alert ?? 0);

// Legacy full-list doc kept here so ProductListingEditorPage's import keeps working.
export { MY_PRODUCT_LISTINGS } from './queries';

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'DENIED'].map((value) => ({ value, label: value }));
type Translate = ReturnType<typeof useTranslation>['t'];

const deliveryOptions = (t: Translate) =>[
  { value: 'HOST', label: t('partners.common.host') },
  { value: 'VENUE', label: t('partners.common.venue') },
];

const getProductRowId = (product: ProductListingRow) => product.id;

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
  const [updateQuantity, quantityState] = useMutation(UPDATE_QUANTITY);
  const [deleteListing, deleteState] = useMutation(DELETE_LISTING);
  const [deleteTarget, setDeleteTarget] = useState<ProductListingRow | null>(null);
  const [pauseTarget, setPauseTarget] = useState<ProductListingRow | null>(null);
  const [adTarget, setAdTarget] = useState<{ product: ProductListingRow; kind: AdKind } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setMessage(null);
    try {
      await deleteListing({ variables: { product_doc_id: deleteTarget.id } });
      setDeleteTarget(null);
      setMessage(t('partners.listProductsPage.productListingDeleted'));
      refetchRef.current?.();
    } catch (deleteError) {
      setMessage(parseApiError(deleteError));
    }
  };

  const columns = useMemo<DuncitColumn<ProductListingRow>[]>(() => {
    const quantityDisabled = !canManageProducts || quantityState.loading;
    const renderQuantity = (product: ProductListingRow) => (
      <QuantityCell product={product} disabled={quantityDisabled} onSave={saveQuantity} />
    );
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
            { key: 'delete', label: t('shell.common.delete'), icon: 'delete', danger: true, disabled: !canManageProducts, onClick: () => setDeleteTarget(product) },
          ]}
        />
      );
    };
    return [
      {
        field: 'product_name',
        headerName: t('partners.listProductsPage.product'),
        flex: 1,
        minWidth: 240,
        cellRenderer: renderProduct,
        valueGetter: (product) => product.product_name,
      },
      {
        field: 'unit_cost',
        headerName: t('partners.common.price'),
        width: 110,
        valueGetter: (product) => `₹${Number(product.unit_cost ?? 0).toFixed(2)}`,
      },
      {
        field: 'inventory_count',
        headerName: t('partners.listProductsPage.quantity'),
        width: 190,
        filter: { type: 'number' },
        cellRenderer: renderQuantity,
        valueGetter: (product) => product.inventory_count ?? 0,
      },
      {
        field: 'listing_review_status',
        headerName: t('shell.common.status'),
        width: 130,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderListingStatus,
        valueGetter: (product) => product.listing_review_status,
      },
      {
        field: 'delivery_target',
        headerName: t('partners.listProductsPage.delivery'),
        hide: true,
        width: 120,
        filter: { type: 'select', options: deliveryOptions(t) },
      },
      {
        field: 'updated_at',
        headerName: t('shell.common.updated'),
        hide: true,
        width: 140,
        filter: { type: 'date' },
        valueGetter: (product) =>
          formatDate(product.updated_at) || '—',
      },
      { field: 'actions', headerName: '', sortable: false, width: 72, cellRenderer: renderActions },
    ];
  }, [canManageProducts, quantityState.loading, saveQuantity, onEdit, onSettings]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{
            fontWeight: 950
          }}>{t('partners.listProductsPage.yourListedProducts')}</Typography>
          {message && (
            <Alert severity={/deleted|updated|submitted/.test(message) ? 'success' : 'error'}>{message}</Alert>
          )}
          <DuncitTable<ProductListingRow>
            tableId="partners-app-product-listings"
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
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('partners.listProductsPage.deleteProductListing')}</DialogTitle>
        <DialogContent><Typography>{deleteTarget?.product_name} will be archived and removed from active listing.</Typography></DialogContent>
        <DialogActions>
          <DuncitButton onClick={() => setDeleteTarget(null)}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton color="error" variant="contained" disabled={deleteState.loading} onClick={confirmDelete}>{t('shell.common.delete')}</DuncitButton>
        </DialogActions>
      </Dialog>
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
