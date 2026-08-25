import { useMemo, type MutableRefObject } from 'react';
import { Avatar, Button, Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { BRAND_STATUS_COLOR } from './brandStatus';
import { useDateFormat } from '@duncit/app-settings';
import type { EcommBrandRow } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<EcommBrandRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onView: (b: EcommBrandRow) => void;
  onReview: (b: EcommBrandRow) => void;
}

const getRowId = (b: EcommBrandRow) => b.id;

const renderLogo = (b: EcommBrandRow) => (
  <Avatar src={b.logo_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
    {b.brand_name?.[0]?.toUpperCase() ?? '?'}
  </Avatar>
);

const renderBrand = (b: EcommBrandRow) => (
  <Stack sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" component="span" sx={{
      fontWeight: 600
    }}>
      {b.brand_name}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
      {b.contact_email || b.contact_phone || '—'}
    </Typography>
  </Stack>
);

const locationValue = (b: EcommBrandRow) =>
  [b.city, b.state].filter(Boolean).join(', ') || '—';

type Translate = ReturnType<typeof useTranslation>['t'];

const renderPickup = (b: EcommBrandRow, t: Translate) =>
  b.default_pickup_location_id ? (
    <Chip size="small" color="success" variant="outlined" icon={<CheckCircleIcon />} label={t('products.pickup.registered')} />
  ) : (
    <Chip size="small" color="warning" variant="outlined" icon={<ErrorOutlineIcon />} label={t('products.pickup.noDefault')} />
  );

const pickupValue = (b: EcommBrandRow) =>
  b.default_pickup_location_id ? 'Registered' : 'No default';

const renderStatus = (b: EcommBrandRow) => (
  <StatusChip status={b.status} colorMap={BRAND_STATUS_COLOR} />
);

export default function BrandsReviewTable({
  fetchRows,
  refetchRef,
  onView,
  onReview,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const columns = useMemo<DuncitColumn<EcommBrandRow>[]>(() => {
    // Rows open the brand, so the action must not also trigger the row click.
    const renderReview = (b: EcommBrandRow) => (
      <Button
        size="small"
        variant="outlined"
        onClick={(event) => {
          event.stopPropagation();
          onReview(b);
        }}
      >
        {t('products.review.action')}
      </Button>
    );
    return [
      { field: 'logo', headerName: '', sortable: false, width: 64, cellRenderer: renderLogo },
      {
        field: 'brand_name',
        headerName: t('products.brands.colBrand'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderBrand,
        valueGetter: (b) => b.brand_name,
      },
      {
        field: 'city',
        headerName: t('products.brands.colLocation'),
        filter: { type: 'text' },
        minWidth: 150,
        valueGetter: locationValue,
      },
      {
        field: 'approved_product_count',
        headerName: t('products.brands.colApprovedProducts'),
        sortable: false,
        width: 150,
      },
      {
        field: 'pickup',
        headerName: t('products.review.colPickup'),
        sortable: false,
        width: 130,
        cellRenderer: (row: EcommBrandRow) => renderPickup(row, t),
        valueGetter: pickupValue,
      },
      {
        // No column filter: the page's status tabs own the status scope and are
        // appended AFTER the column filters, so a column filter here would be
        // silently overridden on every tab but ALL. Mirrors ProductsReviewTable.
        field: 'status',
        headerName: t('shell.common.status'),
        width: 130,
        cellRenderer: renderStatus,
        valueGetter: (b) => b.status,
      },
      {
        field: 'submitted_at',
        headerName: t('products.review.colSubmitted'),
        filter: { type: 'date' },
        width: 130,
        valueGetter: (b) => (b.submitted_at ? formatDate(b.submitted_at) : '—'),
      },
      {
        field: 'created_at',
        headerName: t('shell.common.created'),
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: (b) => (b.created_at ? formatDate(b.created_at) : '—'),
      },
      { field: 'review', headerName: t('products.review.action'), sortable: false, width: 110, cellRenderer: renderReview },
    ];
  }, [onReview, formatDate]);

  return (
    <DuncitTable<EcommBrandRow>
      tableId="products-ecomm-brands"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onView}
      emptyText={t('products.review.brandsEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search brand, contact or city"
      refetchRef={refetchRef}
    />
  );
}
