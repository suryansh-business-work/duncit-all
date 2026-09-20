import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Stack, Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { EcommBrandRow } from './queries';
import { BrandCell, IntegrationsCell, ProgressCell, StatusCell, connectedCount, percentOf } from './brand-table-cells';

const STATUS_OPTIONS = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((value) => ({ value, label: value }));

const getBrandRowId = (brand: EcommBrandRow) => brand.id;
const categoriesValue = (brand: EcommBrandRow) => (brand.product_categories ?? []).join(', ') || '—';
const updatedValue = (brand: EcommBrandRow) => formatDate(brand.updated_at) || '—';

interface Props {
  fetchRows: TableFetch<EcommBrandRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onOpen: (brand: EcommBrandRow) => void;
  onManageProducts: (brand: EcommBrandRow) => void;
  onSettings: (brand: EcommBrandRow) => void;
  onToggleActive: (brand: EcommBrandRow) => void;
  onDelete: (brand: EcommBrandRow) => void;
}

export default function PartnerBrandsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onOpen,
  onManageProducts,
  onSettings,
  onToggleActive,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<EcommBrandRow>[]>(() => {
    const renderActions = (brand: EcommBrandRow) => {
      const approved = brand.status === 'APPROVED';
      const locked = brand.status === 'SUBMITTED' || approved;
      const paused = brand.is_active === false;
      const pauseTitle = paused ? t('partners.brandWizard.danger.reactivate') : t('partners.brandWizard.danger.deactivateTitle');
      return (
        <Stack direction="row" component="span" sx={{ justifyContent: 'flex-end' }}>
          {approved && (
            <Tooltip title={t('partners.ecommBrandPage.products')}>
              <DuncitIconButton size="small" color="primary" onClick={() => onManageProducts(brand)} data-testid="brand-row-products">
                <Inventory2Icon fontSize="small" />
              </DuncitIconButton>
            </Tooltip>
          )}
          {approved && (
            <Tooltip title={pauseTitle}>
              <DuncitIconButton size="small" color={paused ? 'success' : 'warning'} onClick={() => onToggleActive(brand)} data-testid="brand-row-pause">
                {paused ? <PlayCircleOutlineIcon fontSize="small" /> : <PauseCircleOutlineIcon fontSize="small" />}
              </DuncitIconButton>
            </Tooltip>
          )}
          <Tooltip title={locked ? t('partners.ecommBrandPage.view') : t('partners.ecommBrandPage.edit')}>
            <DuncitIconButton size="small" onClick={() => onOpen(brand)} data-testid="brand-row-open">
              {locked ? <VisibilityIcon fontSize="small" /> : <EditIcon fontSize="small" />}
            </DuncitIconButton>
          </Tooltip>
          <Tooltip title={t('partners.ecommBrandPage.brandSettings')}>
            <DuncitIconButton size="small" onClick={() => onSettings(brand)} data-testid="brand-row-settings">
              <SettingsIcon fontSize="small" />
            </DuncitIconButton>
          </Tooltip>
          <Tooltip title={t('partners.ecommBrandPage.deleteBrand')}>
            <DuncitIconButton size="small" color="error" onClick={() => onDelete(brand)} data-testid="brand-row-delete">
              <DeleteOutlineIcon fontSize="small" />
            </DuncitIconButton>
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
        type: 'text',
        cellRenderer: (brand) => <BrandCell brand={brand} />,
        valueGetter: (brand) => brand.brand_name || t('partners.ecommBrandPage.untitledBrand'),
      },
      { field: 'categories', headerName: t('shell.nav.categories'), type: 'text', minWidth: 180, valueGetter: categoriesValue },
      {
        field: 'completion',
        headerName: t('partners.ecommBrandPage.colCompletion'),
        type: 'number',
        width: 170,
        sortable: false,
        filterable: false,
        cellRenderer: (brand) => <ProgressCell brand={brand} />,
        valueGetter: percentOf,
      },
      {
        field: 'integrations',
        headerName: t('partners.ecommBrandPage.colIntegration'),
        type: 'number',
        width: 150,
        sortable: false,
        filterable: false,
        cellRenderer: (brand) => <IntegrationsCell brand={brand} />,
        valueGetter: connectedCount,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 190,
        type: 'enum',
        options: STATUS_OPTIONS,
        cellRenderer: (brand) => <StatusCell brand={brand} />,
        valueGetter: (brand) => brand.status,
      },
      { field: 'updated_at', headerName: t('shell.common.updated'), hide: true, width: 130, type: 'date', valueGetter: updatedValue },
      { field: 'actions', headerName: t('partners.common.action'), type: 'actions', width: 210, cellRenderer: renderActions },
    ];
  }, [t, onOpen, onManageProducts, onSettings, onToggleActive, onDelete]);

  return (
    <DuncitTable<EcommBrandRow>
      tableId="partners-app-ecomm-brands"
      ariaLabel={t('partners.ecommBrandPage.yourBrands')}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getBrandRowId}
      onRowClick={onOpen}
      toolbarActions={toolbarActions}
      emptyText={t('partners.ecommBrandPage.noBrandsYetCreateYourFirst')}
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      searchPlaceholder={t('partners.ecommBrandPage.searchPlaceholder')}
      refetchRef={refetchRef}
    />
  );
}
