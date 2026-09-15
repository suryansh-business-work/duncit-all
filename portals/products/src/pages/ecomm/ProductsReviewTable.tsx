import { useMemo, type MutableRefObject } from 'react';
import { Avatar, Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { REQUEST_STATUS_COLOR, type ProductListingRow } from './requestsQueries';
import { DELIVERY_TARGET_OPTIONS, deliveryTargetLabel } from './deliveryTarget';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<ProductListingRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onReview: (row: ProductListingRow) => void;
}

const DELIVERY_OPTIONS = DELIVERY_TARGET_OPTIONS;
const REQUEST_STATUS_OPTIONS = Object.keys(REQUEST_STATUS_COLOR).map((value) => ({ value, label: value }));

const getRowId = (r: ProductListingRow) => r.id;

const submitterCaption = (r: ProductListingRow) =>
  [r.listing_submitted_by_name || 'Partner', r.size_label, r.color].filter(Boolean).join(' · ');

const renderProduct = (r: ProductListingRow) => (
  <Stack direction="row" spacing={1} component="span" sx={{
    alignItems: "center"
  }}>
    <Avatar alt="" src={r.image_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
      {r.product_name?.[0]?.toUpperCase() ?? '?'}
    </Avatar>
    <Stack sx={{ lineHeight: 1.2, minWidth: 0 }} component="span">
      <Typography variant="body2" noWrap component="span" sx={{
        fontWeight: 600
      }}>
        {r.product_name}
      </Typography>
      <Typography variant="caption" noWrap component="span" sx={{
        color: "text.secondary"
      }}>
        {submitterCaption(r)}
      </Typography>
    </Stack>
  </Stack>
);

const renderDelivery = (r: ProductListingRow) => (
  <Chip size="small" variant="outlined" label={deliveryTargetLabel(r.delivery_target)} />
);

const inventoryValue = (r: ProductListingRow) => `${r.inventory_count} units · ₹${r.unit_cost}`;

const renderCommission = (r: ProductListingRow) => (
  <Stack sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" component="span">
      {r.commission_pct}%
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
      {r.is_duncit_delivery_partner ? 'Delivery partner' : 'Not delivery partner'}
    </Typography>
  </Stack>
);

const renderStatus = (r: ProductListingRow) => (
  <StatusChip status={r.listing_review_status} colorMap={REQUEST_STATUS_COLOR} />
);

export default function ProductsReviewTable({
  fetchRows,
  refetchRef,
  onReview,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const columns = useMemo<DuncitColumn<ProductListingRow>[]>(() => {
    const renderReview = (r: ProductListingRow) => (
      <DuncitButton size="small" variant="outlined" onClick={() => onReview(r)}>
        {t('products.review.action')}
      </DuncitButton>
    );
    return [
      {
        field: 'product_name',
        headerName: t('products.brandProducts.colProduct'),
        flex: 1,
        minWidth: 240,
        type: 'text',
        cellRenderer: renderProduct,
        valueGetter: (r) => r.product_name,
      },
      {
        field: 'delivery_target',
        headerName: t('products.review.colDelivery'),
        type: 'enum',
        options: DELIVERY_OPTIONS,
        width: 140,
        cellRenderer: renderDelivery,
        valueGetter: (r) => deliveryTargetLabel(r.delivery_target),
      },
      {
        field: 'inventory_count',
        headerName: t('products.review.colInventory'),
        width: 150,
        type: 'number',
        valueGetter: inventoryValue,
      },
      {
        field: 'commission_pct',
        headerName: t('products.brands.colCommission'),
        type: 'number',
        width: 150,
        cellRenderer: renderCommission,
        valueGetter: (r) => `${r.commission_pct}%`,
      },
      {
        // No column filter: the page's status tabs own listing_review_status and
        // are appended AFTER the column filters, so a column filter here would be
        // silently overridden on every tab but ALL.
        field: 'status',
        headerName: t('shell.common.status'),
        type: 'enum',
        options: REQUEST_STATUS_OPTIONS,
        filterable: false,
        width: 120,
        cellRenderer: renderStatus,
        valueGetter: (r) => r.listing_review_status,
      },
      {
        field: 'created_at',
        headerName: t('products.review.colSubmitted'),
        type: 'date',
        hide: true,
        width: 130,
        valueGetter: (r) => (r.created_at ? formatDate(r.created_at) : '—'),
      },
      { field: 'review', headerName: t('products.review.action'), type: 'actions', width: 110, cellRenderer: renderReview },
    ];
  }, [onReview, formatDate]);

  return (
    <DuncitTable<ProductListingRow>
      ariaLabel={t('shell.nav.productsReviews')}
      tableId="products-ecomm-requests"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('products.review.productsEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search product, SKU, brand or submitter"
      refetchRef={refetchRef}
    />
  );
}
