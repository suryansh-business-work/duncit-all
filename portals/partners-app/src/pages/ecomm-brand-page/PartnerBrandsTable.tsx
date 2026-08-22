import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Avatar, Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { EcommBrandRow } from './queries';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

const STATUS_COLOR: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

const STATUS_OPTIONS = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((value) => ({
  value,
  label: value,
}));

interface Props {
  fetchRows: TableFetch<EcommBrandRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onOpen: (brand: EcommBrandRow) => void;
  onManageProducts: (brand: EcommBrandRow) => void;
  onSettings: (brand: EcommBrandRow) => void;
  onToggleActive: (brand: EcommBrandRow) => void;
}

const getBrandRowId = (brand: EcommBrandRow) => brand.id;

const renderBrand = (brand: EcommBrandRow) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <Avatar src={brand.logo_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
      {(brand.brand_name || '?').charAt(0).toUpperCase()}
    </Avatar>
    <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Typography variant="body2" fontWeight={700} noWrap component="div">
        {brand.brand_name || 'Untitled brand'}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap component="div">
        {brand.tagline || '—'}
      </Typography>
    </Box>
  </Stack>
);

const categoriesValue = (brand: EcommBrandRow) =>
  (brand.product_categories ?? []).join(', ') || '—';

const renderStatus = (brand: EcommBrandRow) => (
  <Stack direction="row" spacing={0.5} component="span">
    <Chip size="small" color={STATUS_COLOR[brand.status]} label={brand.status} />
    {brand.status === 'APPROVED' && brand.is_active === false && (
      <Chip size="small" color="warning" variant="outlined" label="PAUSED" />
    )}
  </Stack>
);

const updatedValue = (brand: EcommBrandRow) =>
  formatDate(brand.updated_at) || '—';

export default function PartnerBrandsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onOpen,
  onManageProducts,
  onSettings,
  onToggleActive,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<EcommBrandRow>[]>(() => {
    const renderActions = (brand: EcommBrandRow) => {
      const locked = brand.status === 'SUBMITTED' || brand.status === 'APPROVED';
      const paused = brand.is_active === false;
      return (
        <Stack direction="row" justifyContent="flex-end" component="span">
          {brand.status === 'APPROVED' && (
            <Tooltip title={t('partners.common.productManagement')}>
              <IconButton size="small" color="primary" onClick={() => onManageProducts(brand)}>
                <Inventory2Icon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {brand.status === 'APPROVED' && (
            <Tooltip title={paused ? 'Reactivate' : 'Temporarily deactivate'}>
              <IconButton size="small" color={paused ? 'success' : 'warning'} onClick={() => onToggleActive(brand)}>
                {paused ? <PlayCircleOutlineIcon fontSize="small" /> : <PauseCircleOutlineIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={locked ? 'View' : 'Edit'}>
            <IconButton size="small" onClick={() => onOpen(brand)}>
              {locked ? <VisibilityIcon fontSize="small" /> : <EditIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('partners.ecommBrandPage.brandSettings')}>
            <IconButton size="small" onClick={() => onSettings(brand)}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      );
    };
    return [
      {
        field: 'brand_name',
        headerName: t('partners.ecommBrandPage.brand'),
        flex: 1,
        minWidth: 220,
        cellRenderer: renderBrand,
        valueGetter: (brand) => brand.brand_name || 'Untitled brand',
      },
      {
        field: 'categories',
        headerName: t('shell.nav.categories'),
        sortable: false,
        minWidth: 180,
        valueGetter: categoriesValue,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 190,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (brand) => brand.status,
      },
      { field: 'updated_at', headerName: t('shell.common.updated'), hide: true, width: 130, valueGetter: updatedValue },
      { field: 'actions', headerName: t('partners.common.action'), sortable: false, width: 160, cellRenderer: renderActions },
    ];
  }, [onOpen, onManageProducts, onSettings, onToggleActive]);

  return (
    <DuncitTable<EcommBrandRow>
      tableId="partners-app-ecomm-brands"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getBrandRowId}
      onRowClick={onOpen}
      toolbarActions={toolbarActions}
      emptyText={t('partners.ecommBrandPage.noBrandsYetCreateYourFirst')}
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      searchPlaceholder="Search brand name or tagline"
      refetchRef={refetchRef}
    />
  );
}
