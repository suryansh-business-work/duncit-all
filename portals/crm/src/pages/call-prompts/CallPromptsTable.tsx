import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import {
  DuncitTable,
  actionsColumn,
  activeChipColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
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

/** Static Content prompts on the shared server-driven table, with edit / delete actions. */
export default function CallPromptsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<CrmCallPrompt>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 220,
        cellRenderer: renderName,
        valueGetter: (p) => p.name,
      },
      { field: 'language', headerName: 'Language', filter: { type: 'text' }, width: 130 },
      activeChipColumn<CrmCallPrompt>(),
      dateColumn<CrmCallPrompt>(),
      actionsColumn<CrmCallPrompt>({
        onEdit,
        onDelete,
        edit: { ariaLabel: (p) => `Edit ${p.name}` },
        delete: { ariaLabel: (p) => `Delete ${p.name}` },
      }),
    ],
    [onEdit, onDelete],
  );

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
