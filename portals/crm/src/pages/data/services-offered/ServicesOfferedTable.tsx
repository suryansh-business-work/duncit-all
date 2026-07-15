import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { CrmServiceOfferedRow } from '../../../api/data.gql';

interface Props {
  fetchRows: TableFetch<CrmServiceOfferedRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (service: CrmServiceOfferedRow) => void;
  onDelete: (service: CrmServiceOfferedRow) => void;
}

const getServiceRowId = (s: CrmServiceOfferedRow) => s.id;

const dash = (v?: string | null) => (v?.trim() ? v : '—');

const targetLabel = (s: CrmServiceOfferedRow) => {
  if (s.applies_to_venue && s.applies_to_host) return 'Both';
  if (s.applies_to_venue) return 'Venue';
  if (s.applies_to_host) return 'Host';
  return '—';
};

const renderTitle = (s: CrmServiceOfferedRow) => (
  <Typography variant="body2" fontWeight={700} component="span">
    {s.title}
  </Typography>
);

const renderTarget = (s: CrmServiceOfferedRow) => (
  <Chip size="small" variant="outlined" color="primary" label={targetLabel(s)} />
);

const renderStatus = (s: CrmServiceOfferedRow) => (
  <Chip size="small" color={s.is_active ? 'success' : 'default'} label={s.is_active ? 'Active' : 'Inactive'} />
);

const createdValue = (s: CrmServiceOfferedRow) =>
  s.created_at ? format(new Date(s.created_at), 'd MMM yyyy') : '—';

/** Services Offered on the shared server-driven table — Title plus its Super → Category → Sub. */
export default function ServicesOfferedTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<CrmServiceOfferedRow>[]>(() => {
    const renderActions = (s: CrmServiceOfferedRow) => (
      <Stack direction="row" spacing={0.5} justifyContent="flex-end" component="span">
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(s)} aria-label={`Edit ${s.title}`}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(s)} aria-label={`Delete ${s.title}`}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    );
    return [
      { field: 'title', headerName: 'Title', flex: 1, minWidth: 180, cellRenderer: renderTitle, valueGetter: (s) => s.title },
      { field: 'super_category_name', headerName: 'Super Category', sortable: false, minWidth: 150, valueGetter: (s) => dash(s.super_category_name) },
      { field: 'category_name', headerName: 'Category', sortable: false, minWidth: 140, valueGetter: (s) => dash(s.category_name) },
      { field: 'sub_category_name', headerName: 'Sub Category', sortable: false, minWidth: 140, valueGetter: (s) => dash(s.sub_category_name) },
      { field: 'applies_to', headerName: 'Applies to', sortable: false, width: 110, cellRenderer: renderTarget, valueGetter: targetLabel },
      { field: 'applies_to_venue', headerName: 'For Venue', filter: { type: 'boolean' }, hide: true, width: 110, valueGetter: (s) => (s.applies_to_venue ? 'Yes' : 'No') },
      { field: 'applies_to_host', headerName: 'For Host', filter: { type: 'boolean' }, hide: true, width: 110, valueGetter: (s) => (s.applies_to_host ? 'Yes' : 'No') },
      {
        field: 'is_active',
        headerName: 'Status',
        filter: { type: 'boolean' },
        width: 110,
        cellRenderer: renderStatus,
        valueGetter: (s) => (s.is_active ? 'Active' : 'Inactive'),
      },
      { field: 'sort_order', headerName: 'Sort', hide: true, width: 90 },
      {
        field: 'created_at',
        headerName: 'Created',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: createdValue,
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [onEdit, onDelete]);

  return (
    <DuncitTable<CrmServiceOfferedRow>
      tableId="crm-services-offered"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getServiceRowId}
      toolbarActions={toolbarActions}
      emptyText='No services yet. Click "Add Service Offered" to create your first one.'
      searchPlaceholder="Search title or slug"
      refetchRef={refetchRef}
    />
  );
}
