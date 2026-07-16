import { useMemo, type MutableRefObject } from 'react';
import { Avatar, Button, Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { REQUEST_STATUS_COLOR, type ProductListingRow } from './requestsQueries';

interface Props {
  fetchRows: TableFetch<ProductListingRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onReview: (row: ProductListingRow) => void;
}

const DELIVERY_OPTIONS = [
  { value: 'HOST', label: 'Host delivery' },
  { value: 'VENUE', label: 'Venue delivery' },
];

const getRowId = (r: ProductListingRow) => r.id;

const submitterCaption = (r: ProductListingRow) =>
  [r.listing_submitted_by_name || 'Partner', r.size_label, r.color].filter(Boolean).join(' · ');

const renderProduct = (r: ProductListingRow) => (
  <Stack direction="row" spacing={1} alignItems="center" component="span">
    <Avatar src={r.image_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
      {r.product_name?.[0]?.toUpperCase() ?? '?'}
    </Avatar>
    <Stack sx={{ lineHeight: 1.2, minWidth: 0 }} component="span">
      <Typography variant="body2" fontWeight={600} noWrap component="span">
        {r.product_name}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap component="span">
        {submitterCaption(r)}
      </Typography>
    </Stack>
  </Stack>
);

const deliveryLabel = (r: ProductListingRow) =>
  r.delivery_target === 'HOST' ? 'Host delivery' : 'Venue delivery';

const renderDelivery = (r: ProductListingRow) => (
  <Chip size="small" variant="outlined" label={deliveryLabel(r)} />
);

const inventoryValue = (r: ProductListingRow) => `${r.inventory_count} units · ₹${r.unit_cost}`;

const renderCommission = (r: ProductListingRow) => (
  <Stack sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" component="span">
      {r.commission_pct}%
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {r.is_duncit_delivery_partner ? 'Delivery partner' : 'Not delivery partner'}
    </Typography>
  </Stack>
);

const renderStatus = (r: ProductListingRow) => (
  <StatusChip status={r.listing_review_status} colorMap={REQUEST_STATUS_COLOR} />
);

export default function EcommRequestsTable({
  fetchRows,
  refetchRef,
  onReview,
}: Readonly<Props>) {
  const { formatDate } = useDateFormat();
  const columns = useMemo<DuncitColumn<ProductListingRow>[]>(() => {
    const renderReview = (r: ProductListingRow) => (
      <Button size="small" variant="outlined" onClick={() => onReview(r)}>
        Review
      </Button>
    );
    return [
      {
        field: 'product_name',
        headerName: 'Product',
        flex: 1,
        minWidth: 240,
        cellRenderer: renderProduct,
        valueGetter: (r) => r.product_name,
      },
      {
        field: 'delivery_target',
        headerName: 'Delivery',
        filter: { type: 'select', options: DELIVERY_OPTIONS },
        width: 140,
        cellRenderer: renderDelivery,
        valueGetter: deliveryLabel,
      },
      {
        field: 'inventory_count',
        headerName: 'Inventory',
        width: 150,
        valueGetter: inventoryValue,
      },
      {
        field: 'commission_pct',
        headerName: 'Commission',
        filter: { type: 'number' },
        width: 150,
        cellRenderer: renderCommission,
        valueGetter: (r) => `${r.commission_pct}%`,
      },
      {
        field: 'status',
        headerName: 'Status',
        sortable: false,
        width: 120,
        cellRenderer: renderStatus,
        valueGetter: (r) => r.listing_review_status,
      },
      {
        field: 'created_at',
        headerName: 'Submitted',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: (r) => (r.created_at ? formatDate(r.created_at) : '—'),
      },
      { field: 'review', headerName: 'Review', sortable: false, width: 110, cellRenderer: renderReview },
    ];
  }, [onReview, formatDate]);

  return (
    <DuncitTable<ProductListingRow>
      tableId="products-ecomm-requests"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText="No product requests found for this filter."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search product, SKU, brand or submitter"
      refetchRef={refetchRef}
    />
  );
}
