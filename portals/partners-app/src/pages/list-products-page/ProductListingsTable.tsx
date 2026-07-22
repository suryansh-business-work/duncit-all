import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Alert, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { format } from 'date-fns';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { parseApiError } from '@duncit/utils';
import { QuantityCell, renderListingStatus, renderProduct } from './ProductListingCells';
import ProductRowActions from './ProductRowActions';
import RunAdDialog, { type AdKind } from './RunAdDialog';
import { DELETE_LISTING, MY_PRODUCT_LISTINGS_TABLE, UPDATE_QUANTITY, type ProductListingRow } from './queries';

/** Available stock at/below the product's low-stock threshold (opt-in per product). */
const isLowStock = (product: ProductListingRow) =>
  Boolean(product.notify_low_stock) &&
  Number(product.available_count ?? product.inventory_count ?? 0) <= Number(product.low_stock_alert ?? 0);

// Legacy full-list doc kept here so ProductListingEditorPage's import keeps working.
export { MY_PRODUCT_LISTINGS } from './queries';

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'DENIED'].map((value) => ({ value, label: value }));
const DELIVERY_OPTIONS = [
  { value: 'HOST', label: 'Host' },
  { value: 'VENUE', label: 'Venue' },
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
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [updateQuantity, quantityState] = useMutation(UPDATE_QUANTITY);
  const [deleteListing, deleteState] = useMutation(DELETE_LISTING);
  const [deleteTarget, setDeleteTarget] = useState<ProductListingRow | null>(null);
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
        setMessage('Quantity updated.');
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
      setMessage('Product listing deleted.');
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
    const renderActions = (product: ProductListingRow) => (
      <ProductRowActions
        actions={[
          { key: 'edit', label: 'Edit', icon: 'edit', disabled: !canManageProducts, onClick: () => onEdit(product) },
          { key: 'settings', label: 'Settings', icon: 'settings', disabled: !canManageProducts, onClick: () => onSettings?.(product) },
          { key: 'product-ad', label: 'Run Product Ad', icon: 'ad', disabled: !canManageProducts, onClick: () => setAdTarget({ product, kind: 'PRODUCT_AD' }) },
          { key: 'brand-ad', label: 'Run Brand Ad', icon: 'ad', disabled: !canManageProducts, onClick: () => setAdTarget({ product, kind: 'BRAND_AD' }) },
          { key: 'delete', label: 'Delete', icon: 'delete', danger: true, disabled: !canManageProducts, onClick: () => setDeleteTarget(product) },
        ]}
      />
    );
    return [
      {
        field: 'product_name',
        headerName: 'Product',
        flex: 1,
        minWidth: 240,
        cellRenderer: renderProduct,
        valueGetter: (product) => product.product_name,
      },
      {
        field: 'unit_cost',
        headerName: 'Price',
        width: 110,
        valueGetter: (product) => `₹${Number(product.unit_cost ?? 0).toFixed(2)}`,
      },
      {
        field: 'inventory_count',
        headerName: 'Quantity',
        width: 190,
        filter: { type: 'number' },
        cellRenderer: renderQuantity,
        valueGetter: (product) => product.inventory_count ?? 0,
      },
      {
        field: 'listing_review_status',
        headerName: 'Status',
        width: 130,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderListingStatus,
        valueGetter: (product) => product.listing_review_status,
      },
      {
        field: 'delivery_target',
        headerName: 'Delivery',
        hide: true,
        width: 120,
        filter: { type: 'select', options: DELIVERY_OPTIONS },
      },
      {
        field: 'updated_at',
        headerName: 'Updated',
        hide: true,
        width: 140,
        filter: { type: 'date' },
        valueGetter: (product) =>
          product.updated_at ? format(new Date(product.updated_at), 'dd MMM yyyy') : '—',
      },
      { field: 'actions', headerName: '', sortable: false, width: 72, cellRenderer: renderActions },
    ];
  }, [canManageProducts, quantityState.loading, saveQuantity, onEdit, onSettings]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6" fontWeight={950}>Your listed products</Typography>
          {message && (
            <Alert severity={/deleted|updated|submitted/.test(message) ? 'success' : 'error'}>{message}</Alert>
          )}
          <DuncitTable<ProductListingRow>
            tableId="partners-app-product-listings"
            columns={columns}
            fetchRows={fetchRows}
            getRowId={getProductRowId}
            onRowClick={onView}
            getRowStyle={(product) => (isLowStock(product) ? { backgroundColor: 'rgba(237, 108, 2, 0.10)' } : undefined)}
            emptyText="No product listings yet."
            defaultSort={{ field: 'updated_at', dir: 'desc' }}
            searchPlaceholder="Search product, size, color"
            refetchRef={refetchRef}
          />
        </Stack>
      </CardContent>
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete product listing</DialogTitle>
        <DialogContent><Typography>{deleteTarget?.product_name} will be archived and removed from active listing.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={deleteState.loading} onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
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
