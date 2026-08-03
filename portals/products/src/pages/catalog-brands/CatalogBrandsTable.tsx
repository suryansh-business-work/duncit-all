import { useMemo, type MouseEvent } from 'react';
import { Avatar, Button, Chip, Stack, Typography } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import TuneIcon from '@mui/icons-material/Tune';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { BRAND_STATUS_COLOR, BRAND_STATUS_OPTIONS } from '../ecomm/brandStatus';
import type { CatalogBrandRow } from './queries';

interface Props {
  fetchRows: TableFetch<CatalogBrandRow>;
  onProducts: (b: CatalogBrandRow) => void;
  onManage: (b: CatalogBrandRow) => void;
}

const getRowId = (b: CatalogBrandRow) => b.id;

const renderLogo = (b: CatalogBrandRow) => (
  <Avatar src={b.logo_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
    {b.brand_name?.[0]?.toUpperCase() ?? '?'}
  </Avatar>
);

const contactValue = (b: CatalogBrandRow) =>
  b.contact_person || b.contact_email || b.contact_phone || '—';

const renderBrand = (b: CatalogBrandRow) => (
  <Stack sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" fontWeight={600} component="span">
      {b.brand_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {contactValue(b)}
    </Typography>
  </Stack>
);

const locationValue = (b: CatalogBrandRow) => [b.city, b.state].filter(Boolean).join(', ') || '—';

/** 0 means "inherit the per-product / global default cut", not "no commission". */
const commissionValue = (b: CatalogBrandRow) =>
  b.product_commission_pct > 0 ? `${b.product_commission_pct}%` : 'Inherited';

const renderStatus = (b: CatalogBrandRow) => (
  <StatusChip status={b.status} colorMap={BRAND_STATUS_COLOR} />
);

const activeValue = (b: CatalogBrandRow) => (b.is_active ? 'Active' : 'Inactive');

const renderActive = (b: CatalogBrandRow) => (
  <Chip
    size="small"
    variant="outlined"
    color={b.is_active ? 'success' : 'default'}
    label={activeValue(b)}
  />
);

export default function CatalogBrandsTable({ fetchRows, onProducts, onManage }: Readonly<Props>) {
  const { formatDate } = useDateFormat();
  const columns = useMemo<DuncitColumn<CatalogBrandRow>[]>(() => {
    // Row click opens Manage, so both actions must stop the click bubbling.
    const openProducts = (event: MouseEvent, b: CatalogBrandRow) => {
      event.stopPropagation();
      onProducts(b);
    };
    const openManage = (event: MouseEvent, b: CatalogBrandRow) => {
      event.stopPropagation();
      onManage(b);
    };
    const renderActions = (b: CatalogBrandRow) => (
      <Stack direction="row" spacing={1} justifyContent="flex-end" component="span">
        <Button
          size="small"
          variant="outlined"
          startIcon={<Inventory2Icon />}
          onClick={(event) => openProducts(event, b)}
        >
          Products
        </Button>
        <Button size="small" startIcon={<TuneIcon />} onClick={(event) => openManage(event, b)}>
          Manage
        </Button>
      </Stack>
    );
    return [
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
        field: 'product_commission_pct',
        headerName: 'Commission',
        filter: { type: 'number' },
        width: 130,
        valueGetter: commissionValue,
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
        field: 'is_active',
        headerName: 'Active',
        filter: { type: 'boolean' },
        width: 110,
        cellRenderer: renderActive,
        valueGetter: activeValue,
      },
      {
        field: 'created_at',
        headerName: 'Created',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: (b) => (b.created_at ? formatDate(b.created_at) : '—'),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        width: 220,
        cellRenderer: renderActions,
      },
    ];
  }, [onProducts, onManage, formatDate]);

  return (
    <DuncitTable<CatalogBrandRow>
      tableId="products-catalog-brands"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onManage}
      emptyText="No brands found for this filter."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search brand, contact or city"
    />
  );
}
