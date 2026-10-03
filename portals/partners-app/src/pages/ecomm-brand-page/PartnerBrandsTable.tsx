import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LinkIcon from '@mui/icons-material/Link';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import { DuncitTable, rowMenuColumn, type DuncitColumn, type RowMenuItem, type TableFetch } from '@duncit/table';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { EcommBrandRow } from './queries';
import { BrandCell, IntegrationsCell, ProgressCell, StatusCell, connectedCount, percentOf } from './brand-table-cells';

const STATUS_OPTIONS = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((value) => ({ value, label: value }));

const getBrandRowId = (brand: EcommBrandRow) => brand.id;
const categoriesValue = (brand: EcommBrandRow) => (brand.product_categories ?? []).join(', ') || '—';
const updatedValue = (brand: EcommBrandRow) => formatDate(brand.updated_at) || '—';
const renderBrand = (brand: EcommBrandRow) => <BrandCell brand={brand} />;
const renderProgress = (brand: EcommBrandRow) => <ProgressCell brand={brand} />;
const renderIntegrations = (brand: EcommBrandRow) => <IntegrationsCell brand={brand} />;
const renderStatus = (brand: EcommBrandRow) => <StatusCell brand={brand} />;

/** What each row offers. */
export interface BrandRowHandlers {
  /** Row click and View details — the brand details page. */
  onView: (brand: EcommBrandRow) => void;
  /** The setup wizard. */
  onOpen: (brand: EcommBrandRow) => void;
  /** The wizard, on its last step (Integration). */
  onIntegrations: (brand: EcommBrandRow) => void;
  onManageProducts: (brand: EcommBrandRow) => void;
  onSettings: (brand: EcommBrandRow) => void;
  onToggleActive: (brand: EcommBrandRow) => void;
  onDelete: (brand: EcommBrandRow) => void;
}

interface Props extends BrandRowHandlers {
  fetchRows: TableFetch<EcommBrandRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
}

type Translate = ReturnType<typeof useTranslation>['t'];

/** The row menu: details, setup, integrations while not settled, products/pause once approved, settings, delete. */
function brandMenuItems(brand: EcommBrandRow, t: Translate, h: BrandRowHandlers): RowMenuItem[] {
  const approved = brand.status === 'APPROVED';
  const locked = brand.status === 'SUBMITTED' || approved;
  const paused = brand.is_active === false;
  const items: RowMenuItem[] = [
    { key: 'view', label: t('partners.ecommBrandPage.viewDetails'), icon: <VisibilityIcon fontSize="small" />, onClick: () => h.onView(brand) },
    {
      key: 'setup',
      label: locked ? t('partners.ecommBrandPage.view') : t('partners.ecommBrandPage.continueSetup'),
      icon: <EditIcon fontSize="small" />,
      onClick: () => h.onOpen(brand),
    },
  ];
  if (connectedCount(brand) < 2) {
    items.push({
      key: 'integrations',
      label: t('partners.ecommBrandPage.connectIntegrations'),
      icon: <LinkIcon fontSize="small" />,
      onClick: () => h.onIntegrations(brand),
    });
  }
  if (approved) {
    items.push(
      {
        key: 'products',
        label: t('partners.ecommBrandPage.products'),
        icon: <Inventory2Icon fontSize="small" />,
        onClick: () => h.onManageProducts(brand),
      },
      {
        key: 'pause',
        label: paused ? t('partners.brandWizard.danger.reactivate') : t('partners.brandWizard.danger.deactivateTitle'),
        icon: paused ? <PlayCircleOutlineIcon fontSize="small" /> : <PauseCircleOutlineIcon fontSize="small" />,
        onClick: () => h.onToggleActive(brand),
      },
    );
  }
  items.push(
    { key: 'settings', label: t('partners.ecommBrandPage.brandSettings'), icon: <SettingsIcon fontSize="small" />, onClick: () => h.onSettings(brand) },
    {
      key: 'delete',
      label: t('partners.ecommBrandPage.deleteBrand'),
      icon: <DeleteOutlineIcon fontSize="small" />,
      onClick: () => h.onDelete(brand),
      destructive: true,
    },
  );
  return items;
}

export default function PartnerBrandsTable({ fetchRows, refetchRef, toolbarActions, ...handlers }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onView, onOpen, onIntegrations, onManageProducts, onSettings, onToggleActive, onDelete } = handlers;
  const columns = useMemo<DuncitColumn<EcommBrandRow>[]>(() => {
    const h = { onView, onOpen, onIntegrations, onManageProducts, onSettings, onToggleActive, onDelete };
    return [
      {
        field: 'brand_name',
        headerName: t('partners.ecommBrandPage.brand'),
        flex: 1,
        minWidth: 220,
        type: 'text',
        cellRenderer: renderBrand,
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
        cellRenderer: renderProgress,
        valueGetter: percentOf,
      },
      {
        field: 'integrations',
        headerName: t('partners.ecommBrandPage.colIntegration'),
        type: 'number',
        width: 170,
        sortable: false,
        filterable: false,
        cellRenderer: renderIntegrations,
        valueGetter: connectedCount,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 250,
        type: 'enum',
        options: STATUS_OPTIONS,
        cellRenderer: renderStatus,
        valueGetter: (brand) => brand.status,
      },
      { field: 'updated_at', headerName: t('shell.common.updated'), hide: true, width: 130, type: 'date', valueGetter: updatedValue },
      rowMenuColumn<EcommBrandRow>({
        headerName: t('partners.common.action'),
        width: 90,
        ariaLabel: (brand) =>
          t('partners.ecommBrandPage.rowMenu', { vars: { brand: brand.brand_name || t('partners.ecommBrandPage.untitledBrand') } }),
        items: (brand) => brandMenuItems(brand, t, h),
      }),
    ];
  }, [t, onView, onOpen, onIntegrations, onManageProducts, onSettings, onToggleActive, onDelete]);

  return (
    <DuncitTable<EcommBrandRow>
      tableId="partners-app-ecomm-brands"
      ariaLabel={t('partners.ecommBrandPage.yourBrands')}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getBrandRowId}
      onRowClick={onView}
      toolbarActions={toolbarActions}
      emptyText={t('partners.ecommBrandPage.noBrandsYetCreateYourFirst')}
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      searchPlaceholder={t('partners.ecommBrandPage.searchPlaceholder')}
      refetchRef={refetchRef}
    />
  );
}
