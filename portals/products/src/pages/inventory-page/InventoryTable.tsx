import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Avatar, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import StockColorChip from './inventory-product-page/StockColorChip';
import { STATUS_CHIP_COLOR, STATUS_OPTIONS } from './inventory-product-page/constants';
import { useDateFormat } from '../../utils/dateFormat';
import type { InventoryProductRow } from './queries';

interface Props {
  fetchRows: TableFetch<InventoryProductRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (p: InventoryProductRow) => void;
  onArchive: (p: InventoryProductRow) => void;
  onDelete: (p: InventoryProductRow) => void;
}

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

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
  <Chip size="small" label={p.status} color={STATUS_CHIP_COLOR[p.status] ?? 'default'} />
);

const priceValue = (p: InventoryProductRow) => money.format(p.selling_price || p.unit_cost);

export default function InventoryTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onArchive,
  onDelete,
}: Readonly<Props>) {
  const { formatDate } = useDateFormat();
  const columns = useMemo<DuncitColumn<InventoryProductRow>[]>(() => {
    const renderActions = (p: InventoryProductRow) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(p)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Archive">
          <IconButton size="small" onClick={() => onArchive(p)}>
            <ArchiveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete permanently">
          <IconButton size="small" color="error" onClick={() => onDelete(p)}>
            <DeleteForeverIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    );
    return [
      { field: 'cover', headerName: '', sortable: false, width: 64, cellRenderer: renderCover },
      {
        field: 'product_name',
        headerName: 'Product',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderProduct,
        valueGetter: (p) => p.product_name,
      },
      { field: 'sku', headerName: 'SKU', filter: { type: 'text' }, width: 140 },
      {
        field: 'selling_price',
        headerName: 'Selling price',
        filter: { type: 'number' },
        width: 130,
        valueGetter: priceValue,
      },
      {
        field: 'inventory_count',
        headerName: 'Stock',
        filter: { type: 'number' },
        width: 150,
        cellRenderer: renderStock,
        valueGetter: (p) => p.inventory_count,
      },
      { field: 'available_count', headerName: 'Available', sortable: false, width: 100 },
      {
        field: 'status',
        headerName: 'Status',
        filter: { type: 'select', options: STATUS_OPTIONS },
        width: 130,
        cellRenderer: renderStatus,
        valueGetter: (p) => p.status,
      },
      { field: 'brand_name', headerName: 'Brand', filter: { type: 'text' }, hide: true, minWidth: 140 },
      {
        field: 'created_at',
        headerName: 'Created',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: (p) => (p.created_at ? formatDate(p.created_at) : '—'),
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 140, cellRenderer: renderActions },
    ];
  }, [onEdit, onArchive, onDelete, formatDate]);

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
