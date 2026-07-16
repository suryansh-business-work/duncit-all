import { useMemo, type MutableRefObject } from 'react';
import { Avatar, Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { BRAND_STATUS_COLOR, BRAND_STATUS_OPTIONS } from './brandStatus';
import { useDateFormat } from '@duncit/app-settings';
import type { EcommBrandRow } from './queries';

interface Props {
  fetchRows: TableFetch<EcommBrandRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onView: (b: EcommBrandRow) => void;
}

const getRowId = (b: EcommBrandRow) => b.id;

const renderLogo = (b: EcommBrandRow) => (
  <Avatar src={b.logo_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
    {b.brand_name?.[0]?.toUpperCase() ?? '?'}
  </Avatar>
);

const renderBrand = (b: EcommBrandRow) => (
  <Stack sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" fontWeight={600} component="span">
      {b.brand_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {b.contact_email || b.contact_phone || '—'}
    </Typography>
  </Stack>
);

const locationValue = (b: EcommBrandRow) =>
  [b.city, b.state].filter(Boolean).join(', ') || '—';

const renderPickup = (b: EcommBrandRow) =>
  b.default_pickup_location_id ? (
    <Chip size="small" color="success" variant="outlined" icon={<CheckCircleIcon />} label="Registered" />
  ) : (
    <Chip size="small" color="warning" variant="outlined" icon={<ErrorOutlineIcon />} label="No default" />
  );

const pickupValue = (b: EcommBrandRow) =>
  b.default_pickup_location_id ? 'Registered' : 'No default';

const renderStatus = (b: EcommBrandRow) => (
  <StatusChip status={b.status} colorMap={BRAND_STATUS_COLOR} />
);

export default function EcommBrandsTable({ fetchRows, refetchRef, onView }: Readonly<Props>) {
  const { formatDate } = useDateFormat();
  const columns = useMemo<DuncitColumn<EcommBrandRow>[]>(
    () => [
      { field: 'logo', headerName: '', sortable: false, width: 64, cellRenderer: renderLogo },
      {
        field: 'brand_name',
        headerName: 'Brand',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderBrand,
        valueGetter: (b) => b.brand_name,
      },
      {
        field: 'city',
        headerName: 'Location',
        filter: { type: 'text' },
        minWidth: 150,
        valueGetter: locationValue,
      },
      {
        field: 'approved_product_count',
        headerName: 'Approved products',
        sortable: false,
        width: 150,
      },
      {
        field: 'pickup',
        headerName: 'Pickup',
        sortable: false,
        width: 130,
        cellRenderer: renderPickup,
        valueGetter: pickupValue,
      },
      {
        field: 'status',
        headerName: 'Status',
        filter: { type: 'select', options: BRAND_STATUS_OPTIONS },
        width: 130,
        cellRenderer: renderStatus,
        valueGetter: (b) => b.status,
      },
      {
        field: 'created_at',
        headerName: 'Created',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: (b) => (b.created_at ? formatDate(b.created_at) : '—'),
      },
    ],
    [formatDate],
  );

  return (
    <DuncitTable<EcommBrandRow>
      tableId="products-ecomm-brands"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onView}
      emptyText="No brands found for this filter."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search brand, contact or city"
      refetchRef={refetchRef}
    />
  );
}
