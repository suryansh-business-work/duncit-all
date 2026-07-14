import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { PodPlanFormValues } from './PodPlanFormDialog';

export interface PlanRow extends PodPlanFormValues {
  id: string;
  updated_at?: string;
}

interface Props {
  fetchRows: TableFetch<PlanRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (row: PlanRow) => void;
  onDelete: (row: PlanRow) => void;
}

const getPlanRowId = (r: PlanRow) => r.id;

const descriptionSnippet = (r: PlanRow) => {
  if (!r.description) return '';
  const clipped = r.description.slice(0, 60);
  return r.description.length > 60 ? `${clipped}…` : clipped;
};

const renderName = (r: PlanRow) => (
  <Stack direction="row" spacing={1.5} alignItems="center" component="span">
    {r.image_url && (
      <Box
        component="img"
        src={r.image_url}
        alt=""
        sx={{ width: 32, height: 32, borderRadius: 1, objectFit: 'cover' }}
      />
    )}
    <Box sx={{ lineHeight: 1.2 }} component="span">
      <Typography variant="body2" fontWeight={600} component="span" display="block">
        {r.name}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="span" display="block">
        {descriptionSnippet(r)}
      </Typography>
    </Box>
  </Stack>
);

const renderKey = (r: PlanRow) => <code>{r.key}</code>;

const renderStatus = (r: PlanRow) => (
  <Stack direction="row" spacing={0.5} component="span">
    <Chip
      size="small"
      label={r.is_active ? 'Active' : 'Inactive'}
      color={r.is_active ? 'success' : 'default'}
    />
    {r.is_coming_soon && <Chip size="small" label="Coming soon" color="warning" />}
  </Stack>
);

export default function PodPlansTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<PlanRow>[]>(() => {
    const renderActions = (r: PlanRow) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <IconButton size="small" onClick={() => onEdit(r)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" color="error" onClick={() => onDelete(r)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
    );
    return [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 220,
        cellRenderer: renderName,
        valueGetter: (r) => r.name,
      },
      {
        field: 'key',
        headerName: 'Key',
        filter: { type: 'text' },
        width: 130,
        cellRenderer: renderKey,
        valueGetter: (r) => r.key,
      },
      {
        field: 'price_label',
        headerName: 'Price label',
        minWidth: 140,
        valueGetter: (r) => r.price_label || '—',
      },
      {
        field: 'features',
        headerName: 'Features',
        sortable: false,
        width: 100,
        valueGetter: (r) => (r.features ?? []).length,
      },
      {
        field: 'is_active',
        headerName: 'Status',
        filter: { type: 'boolean' },
        minWidth: 180,
        cellRenderer: renderStatus,
        valueGetter: (r) => (r.is_active ? 'Active' : 'Inactive'),
      },
      {
        field: 'is_coming_soon',
        headerName: 'Coming soon',
        sortable: false,
        filter: { type: 'boolean' },
        hide: true,
        width: 130,
        valueGetter: (r) => (r.is_coming_soon ? 'Yes' : 'No'),
      },
      { field: 'sort_order', headerName: 'Sort', hide: true, width: 90 },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [onEdit, onDelete]);

  return (
    <DuncitTable<PlanRow>
      tableId="admin-pod-plans"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPlanRowId}
      toolbarActions={toolbarActions}
      emptyText='No plans yet. Click "New plan" to create one.'
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      searchPlaceholder="Search name or key"
      refetchRef={refetchRef}
    />
  );
}
