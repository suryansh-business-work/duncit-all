import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, IconButton, Stack } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useDateFormat } from '../../../utils/dateFormat';
import { NAV_AREAS, type WebsiteNavItem } from './queries';

interface Props {
  fetchRows: TableFetch<WebsiteNavItem>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (item: WebsiteNavItem) => void;
  onDelete: (item: WebsiteNavItem) => void;
}

const getNavRowId = (item: WebsiteNavItem) => item.id;

const AREA_OPTIONS = NAV_AREAS.map((area) => ({ value: area, label: area }));

const renderStatus = (item: WebsiteNavItem) => (
  <Chip
    size="small"
    label={item.is_active ? 'Active' : 'Hidden'}
    color={item.is_active ? 'success' : 'default'}
  />
);

export default function NavigationTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { formatDate } = useDateFormat();

  const columns = useMemo<DuncitColumn<WebsiteNavItem>[]>(() => {
    const renderActions = (item: WebsiteNavItem) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <IconButton size="small" aria-label="edit" onClick={() => onEdit(item)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" color="error" aria-label="delete" onClick={() => onDelete(item)}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>
    );
    return [
      {
        field: 'area',
        headerName: 'Area',
        filter: { type: 'select', options: AREA_OPTIONS },
        width: 110,
      },
      {
        field: 'group_label',
        headerName: 'Group',
        filter: { type: 'text' },
        minWidth: 130,
        valueGetter: (item) => item.group_label || '—',
      },
      { field: 'label', headerName: 'Label', flex: 1, minWidth: 150 },
      { field: 'url', headerName: 'URL', flex: 1, minWidth: 200 },
      { field: 'sort_order', headerName: 'Order', width: 90 },
      {
        field: 'is_active',
        headerName: 'Status',
        filter: { type: 'boolean' },
        width: 110,
        cellRenderer: renderStatus,
        valueGetter: (item) => (item.is_active ? 'Active' : 'Hidden'),
      },
      {
        field: 'created_at',
        headerName: 'Created',
        filter: { type: 'date' },
        hide: true,
        width: 150,
        valueGetter: (item) => (item.created_at ? formatDate(item.created_at) : '—'),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        width: 110,
        cellRenderer: renderActions,
      },
    ];
  }, [formatDate, onEdit, onDelete]);

  return (
    <DuncitTable<WebsiteNavItem>
      tableId="website-nav"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getNavRowId}
      toolbarActions={toolbarActions}
      emptyText="No links for this site yet."
      defaultSort={{ field: 'area', dir: 'asc' }}
      searchPlaceholder="Search label, group or URL"
      refetchRef={refetchRef}
    />
  );
}
