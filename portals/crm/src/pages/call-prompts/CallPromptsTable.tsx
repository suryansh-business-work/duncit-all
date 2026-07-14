import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { CrmCallPrompt } from '../../api/call.gql';

interface Props {
  fetchRows: TableFetch<CrmCallPrompt>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (prompt: CrmCallPrompt) => void;
  onDelete: (prompt: CrmCallPrompt) => void;
}

const getPromptRowId = (p: CrmCallPrompt) => p.id;

const renderName = (p: CrmCallPrompt) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="span">
      {p.name}
    </Typography>
    {p.description && (
      <Typography variant="caption" color="text.secondary" component="span">
        {p.description}
      </Typography>
    )}
  </Stack>
);

const renderStatus = (p: CrmCallPrompt) => (
  <Chip size="small" color={p.is_active ? 'success' : 'default'} label={p.is_active ? 'Active' : 'Inactive'} />
);

const createdValue = (p: CrmCallPrompt) =>
  p.created_at ? format(new Date(p.created_at), 'd MMM yyyy') : '—';

/** Static Content prompts on the shared server-driven table, with edit / delete actions. */
export default function CallPromptsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<CrmCallPrompt>[]>(() => {
    const renderActions = (p: CrmCallPrompt) => (
      <Stack direction="row" spacing={0.5} justifyContent="flex-end" component="span">
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(p)} aria-label={`Edit ${p.name}`}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(p)} aria-label={`Delete ${p.name}`}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    );
    return [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 220,
        cellRenderer: renderName,
        valueGetter: (p) => p.name,
      },
      { field: 'language', headerName: 'Language', filter: { type: 'text' }, width: 130 },
      {
        field: 'is_active',
        headerName: 'Status',
        filter: { type: 'boolean' },
        width: 110,
        cellRenderer: renderStatus,
        valueGetter: (p) => (p.is_active ? 'Active' : 'Inactive'),
      },
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
    <DuncitTable<CrmCallPrompt>
      tableId="crm-call-prompts"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPromptRowId}
      toolbarActions={toolbarActions}
      emptyText='No Static Content yet. Click "Add Static Content" to create your first AI Call prompt.'
      searchPlaceholder="Search name, description or context"
      refetchRef={refetchRef}
    />
  );
}
