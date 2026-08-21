import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Avatar, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import StockColorChip from './inventory-product-page/StockColorChip';
import { STATUS_CHIP_COLOR, STATUS_OPTIONS } from './inventory-product-page/constants';
import { useDateFormat } from '@duncit/app-settings';
import type { InventoryProductRow } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<InventoryProductRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (p: InventoryProductRow) => void;
  onArchive: (p: InventoryProductRow) => void;
  /** Temporarily deactivate an active product, reactivate a paused one. */
  onToggleActive: (p: InventoryProductRow) => void;
  onDelete: (p: InventoryProductRow) => void;
}

const getRowId = (p: InventoryProductRow) => p.id;

const renderCover = (p: InventoryProductRow) => (
  <Avatar src={p.image_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
    {p.product_name?.[0]?.toUpperCase() ?? '?'}
  </Avatar>
);

const renderProduct = (p: InventoryProductRow) => (
  <Stack sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" fontWeight={600} component="span">
      {p.product_name}
    </Typography>
    {p.brand_name && (
      <Typography variant="caption" color="text.secondary" component="span">
        {p.brand_name}
      </Typography>
    )}
  </Stack>
);

const renderStock = (p: InventoryProductRow) => (
  <StockColorChip inventory={p.inventory_count} lowStockAlert={p.low_stock_alert ?? 5} />
);

const renderStatus = (p: InventoryProductRow) => (
  <StatusChip status={p.status} colorMap={STATUS_CHIP_COLOR} />
);

const activeValue = (p: InventoryProductRow) => (p.is_active ? 'Active' : 'Inactive');

const renderActive = (p: InventoryProductRow) => (
  <Chip
    size="small"
    variant="outlined"
    label={activeValue(p)}
    color={p.is_active ? 'success' : 'default'}
  />
);

const priceValue = (p: InventoryProductRow) =>
  formatMoney(p.selling_price || p.unit_cost, { decimals: 2 });

export default function InventoryTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onArchive,
  onToggleActive,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const columns = useMemo<DuncitColumn<InventoryProductRow>[]>(() => {
    const renderActions = (p: InventoryProductRow) => {
      const paused = p.is_active === false;
      const pauseLabel = paused ? 'Reactivate' : 'Temporarily deactivate';
      return (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <Tooltip title={t('shell.common.edit')}>
          <IconButton size="small" onClick={() => onEdit(p)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {p.status !== 'ARCHIVED' && (
          <Tooltip title={pauseLabel}>
            <IconButton size="small" color={paused ? 'success' : 'warning'} onClick={() => onToggleActive(p)}>
              {paused ? <PlayCircleOutlineIcon fontSize="small" /> : <PauseCircleOutlineIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={t('products.inventory.archive')}>
          <IconButton size="small" onClick={() => onArchive(p)}>
            <ArchiveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('products.inventory.deletePermanently')}>
          <IconButton size="small" color="error" onClick={() => onDelete(p)}>
            <DeleteForeverIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      );
    };
    return [
      { field: 'cover', headerName: '', sortable: false, width: 64, cellRenderer: renderCover },
      {
        field: 'product_name',
        headerName: t('products.inventory.colProduct'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderProduct,
        valueGetter: (p) => p.product_name,
      },
      { field: 'sku', headerName: 'SKU', filter: { type: 'text' }, width: 140 },
      {
        field: 'selling_price',
        headerName: t('products.pricing.sellingPrice'),
        filter: { type: 'number' },
        width: 130,
        valueGetter: priceValue,
      },
      {
        field: 'inventory_count',
        headerName: t('products.inventory.colStock'),
        filter: { type: 'number' },
        width: 150,
        cellRenderer: renderStock,
        valueGetter: (p) => p.inventory_count,
      },
      { field: 'available_count', headerName: t('products.inventory.colAvailable'), sortable: false, width: 100 },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        filter: { type: 'select', options: STATUS_OPTIONS },
        width: 130,
        cellRenderer: renderStatus,
        valueGetter: (p) => p.status,
      },
      {
        field: 'is_active',
        headerName: t('products.inventory.colActive'),
        sortable: false,
        filter: { type: 'boolean' },
        width: 110,
        cellRenderer: renderActive,
        valueGetter: activeValue,
      },
      { field: 'brand_name', headerName: t('products.inventory.colBrand'), filter: { type: 'text' }, hide: true, minWidth: 140 },
      {
        field: 'created_at',
        headerName: t('products.inventory.created'),
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: (p) => (p.created_at ? formatDate(p.created_at) : '—'),
      },
      { field: 'actions', headerName: t('shell.common.actions'), sortable: false, width: 170, cellRenderer: renderActions },
    ];
  }, [onEdit, onArchive, onToggleActive, onDelete, formatDate]);

  return (
    <DuncitTable<InventoryProductRow>
      tableId="products-inventory"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onEdit}
      toolbarActions={toolbarActions}
      emptyText='No products yet. Click "Add product" to create the first one.'
      defaultSort={{ field: 'product_name', dir: 'asc' }}
      searchPlaceholder="Search name, SKU, brand or tags"
      refetchRef={refetchRef}
    />
  );
}
