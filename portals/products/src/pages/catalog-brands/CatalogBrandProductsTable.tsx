import { useMemo, type MutableRefObject } from 'react';
import { Avatar, Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { useDateFormat } from '@duncit/app-settings';
import {
  STATUS_CHIP_COLOR,
  STATUS_OPTIONS,
} from '../inventory-page/inventory-product-page/constants';
import { REQUEST_STATUS_COLOR } from '../ecomm/requestsQueries';
import CatalogBrandProductActions from './CatalogBrandProductActions';
import type { CatalogBrandProductRow } from './queries';

interface Props {
  fetchRows: TableFetch<CatalogBrandProductRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onEdit: (p: CatalogBrandProductRow) => void;
  /** Archive an active product, restore an archived one. */
  onLifecycle: (p: CatalogBrandProductRow) => void;
  onDuplicate: (p: CatalogBrandProductRow) => void;
}

const getRowId = (p: CatalogBrandProductRow) => p.id;

const renderCover = (p: CatalogBrandProductRow) => (
  <Avatar src={p.image_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
    {p.product_name?.[0]?.toUpperCase() ?? '?'}
  </Avatar>
);

const renderProduct = (p: CatalogBrandProductRow) => (
  <Stack sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" fontWeight={600} component="span">
      {p.product_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {p.sku}
    </Typography>
  </Stack>
);

const priceValue = (p: CatalogBrandProductRow) =>
  formatMoney(p.selling_price || p.unit_cost, { decimals: 2 });

const renderListingStatus = (p: CatalogBrandProductRow) => (
  <StatusChip status={p.listing_review_status} colorMap={REQUEST_STATUS_COLOR} />
);

const activeValue = (p: CatalogBrandProductRow) => (p.is_active ? 'Active' : 'Inactive');

const renderActive = (p: CatalogBrandProductRow) => (
  <Chip
    size="small"
    variant="outlined"
    label={activeValue(p)}
    color={p.is_active ? 'success' : 'default'}
  />
);

const renderStatus = (p: CatalogBrandProductRow) => (
  <StatusChip status={p.status} colorMap={STATUS_CHIP_COLOR} />
);

/**
 * Every product of one brand — approved listings plus the PENDING and DENIED
 * ones the storefront query hides. Listing approve/reject is NOT offered here;
 * that decision belongs to Brands & Products Review.
 */
export default function CatalogBrandProductsTable({
  fetchRows,
  refetchRef,
  onEdit,
  onLifecycle,
  onDuplicate,
}: Readonly<Props>) {
  const { formatDate } = useDateFormat();

  const columns = useMemo<DuncitColumn<CatalogBrandProductRow>[]>(() => {
    const renderActions = (p: CatalogBrandProductRow) => (
      <CatalogBrandProductActions
        product={p}
        onEdit={onEdit}
        onLifecycle={onLifecycle}
        onDuplicate={onDuplicate}
      />
    );

    return [
      { field: 'cover', headerName: '', sortable: false, width: 64, cellRenderer: renderCover },
      {
        field: 'product_name',
        headerName: 'Product',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderProduct,
        valueGetter: (p) => p.product_name,
      },
      { field: 'sku', headerName: 'SKU', filter: { type: 'text' }, width: 140 },
      {
        field: 'selling_price',
        headerName: 'Price',
        filter: { type: 'number' },
        width: 120,
        valueGetter: priceValue,
      },
      {
        field: 'available',
        headerName: 'Available',
        sortable: false,
        width: 110,
        valueGetter: (p) => p.available_count,
      },
      {
        field: 'listing_review_status',
        headerName: 'Listing review',
        sortable: false,
        width: 140,
        cellRenderer: renderListingStatus,
        valueGetter: (p) => p.listing_review_status,
      },
      {
        field: 'commission_pct',
        headerName: 'Commission',
        sortable: false,
        width: 120,
        valueGetter: (p) => `${p.commission_pct}%`,
      },
      {
        field: 'is_active',
        headerName: 'Active',
        sortable: false,
        filter: { type: 'boolean' },
        width: 110,
        cellRenderer: renderActive,
        valueGetter: activeValue,
      },
      {
        field: 'status',
        headerName: 'Status',
        filter: { type: 'select', options: STATUS_OPTIONS },
        hide: true,
        width: 130,
        cellRenderer: renderStatus,
        valueGetter: (p) => p.status,
      },
      {
        field: 'created_at',
        headerName: 'Added',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: (p) => (p.created_at ? formatDate(p.created_at) : '—'),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        width: 140,
        cellRenderer: renderActions,
      },
    ];
  }, [onEdit, onLifecycle, onDuplicate, formatDate]);

  return (
    <DuncitTable<CatalogBrandProductRow>
      tableId="products-catalog-brand-products"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onEdit}
      emptyText="This brand has no products yet."
      defaultSort={{ field: 'product_name', dir: 'asc' }}
      searchPlaceholder="Search product, SKU or tags"
      refetchRef={refetchRef}
    />
  );
}
