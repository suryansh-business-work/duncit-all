import { useMemo } from 'react';
import { Avatar, Chip, Stack, Typography } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import TuneIcon from '@mui/icons-material/Tune';
import InsightsIcon from '@mui/icons-material/Insights';
import { DuncitTable, rowMenuColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { BRAND_STATUS_COLOR, BRAND_STATUS_OPTIONS } from '../ecomm/brandStatus';
import type { CatalogBrandRow } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<CatalogBrandRow>;
  onProducts: (b: CatalogBrandRow) => void;
  onManage: (b: CatalogBrandRow) => void;
  /** The brand page with analytics and the activity log. */
  onDetails: (b: CatalogBrandRow) => void;
}

const getRowId = (b: CatalogBrandRow) => b.id;

const renderLogo = (b: CatalogBrandRow) => (
  <Avatar alt="" src={b.logo_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
    {b.brand_name?.[0]?.toUpperCase() ?? '?'}
  </Avatar>
);

const contactValue = (b: CatalogBrandRow) =>
  b.contact_person || b.contact_email || b.contact_phone || '—';

const renderBrand = (b: CatalogBrandRow) => (
  <Stack sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" component="span" sx={{
      fontWeight: 600
    }}>
      {b.brand_name}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
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

export default function CatalogBrandsTable({ fetchRows, onProducts, onManage, onDetails }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const columns = useMemo<DuncitColumn<CatalogBrandRow>[]>(() => {
    return [
      // A decorative thumbnail — no value to order or match.
      { field: 'logo', headerName: '', type: 'actions', width: 64, cellRenderer: renderLogo },
      {
        field: 'brand_name',
        headerName: t('products.brandForm.section'),
        flex: 1,
        minWidth: 200,
        type: 'text',
        cellRenderer: renderBrand,
        valueGetter: (b) => b.brand_name,
      },
      {
        field: 'city',
        headerName: t('products.brands.colLocation'),
        type: 'text',
        minWidth: 150,
        valueGetter: locationValue,
      },
      {
        field: 'approved_product_count',
        headerName: t('products.brands.colApprovedProducts'),
        type: 'number',
        // A count of the products collection resolved per row — the brand document holds no path to order or match.
        sortable: false,
        filterable: false,
        width: 150,
      },
      {
        field: 'product_commission_pct',
        headerName: t('products.brands.colCommission'),
        type: 'number',
        width: 130,
        valueGetter: commissionValue,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        type: 'enum',
        options: BRAND_STATUS_OPTIONS,
        width: 130,
        cellRenderer: renderStatus,
        valueGetter: (b) => b.status,
      },
      {
        field: 'is_active',
        headerName: t('products.brands.colActive'),
        type: 'boolean',
        width: 110,
        cellRenderer: renderActive,
        valueGetter: activeValue,
      },
      {
        field: 'created_at',
        headerName: t('shell.common.created'),
        type: 'date',
        hide: true,
        width: 130,
        valueGetter: (b) => (b.created_at ? formatDate(b.created_at) : '—'),
      },
      rowMenuColumn<CatalogBrandRow>({
        width: 90,
        ariaLabel: (b) => t('products.brands.rowMenu', { vars: { brand: b.brand_name } }),
        items: (b) => [
          { key: 'manage', label: t('products.brands.menuManage'), icon: <TuneIcon fontSize="small" />, onClick: () => onManage(b) },
          {
            key: 'details',
            label: t('products.brands.menuDetails'),
            icon: <InsightsIcon fontSize="small" />,
            onClick: () => onDetails(b),
          },
          {
            key: 'products',
            label: t('products.brands.menuProducts'),
            icon: <Inventory2Icon fontSize="small" />,
            onClick: () => onProducts(b),
          },
        ],
      }),
    ];
  }, [onProducts, onManage, onDetails, formatDate, t]);

  return (
    <DuncitTable<CatalogBrandRow>
      ariaLabel={t('shell.nav.brands')}
      tableId="products-catalog-brands"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onManage}
      emptyText={t('products.brands.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search brand, contact or city"
    />
  );
}
