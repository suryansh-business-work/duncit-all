import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import {
  DuncitTable,
  actionsColumn,
  activeChipColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import type { AiPrompt } from './queries';

interface Props {
  fetchRows: TableFetch<AiPrompt>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (prompt: AiPrompt) => void;
  onDelete: (prompt: AiPrompt) => void;
}

const getPromptRowId = (p: AiPrompt) => p.id;

const renderName = (p: AiPrompt) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="div">
      {p.name}
    </Typography>
    {p.description && (
      <Typography variant="caption" color="text.secondary" component="div">
        {p.description}
      </Typography>
    )}
  </Box>
);

const renderCategory = (p: AiPrompt) => <Chip size="small" variant="outlined" label={p.category} />;

const renderModel = (p: AiPrompt) => (
  <Typography variant="body2" color={p.target_model ? 'text.primary' : 'text.disabled'}>
    {p.target_model || '—'}
  </Typography>
);

const renderTokens = (p: AiPrompt) => (
  <Tooltip title="Estimated token size of the prompt content">
    <Chip size="small" color="primary" variant="outlined" label={`≈ ${p.token_count}`} />
  </Tooltip>
);

/** Prompt Library table — name/category/model/token size/status with row actions. */
export default function PromptsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<AiPrompt>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 220,
        cellRenderer: renderName,
        valueGetter: (p) => p.name,
      },
      {
        field: 'category',
        headerName: 'Category',
        minWidth: 140,
        filter: { type: 'text' },
        cellRenderer: renderCategory,
        valueGetter: (p) => p.category,
      },
      {
        field: 'target_model',
        headerName: 'Model',
        width: 150,
        cellRenderer: renderModel,
        valueGetter: (p) => p.target_model || '—',
      },
      {
        field: 'token_count',
        headerName: 'Tokens',
        width: 110,
        filter: { type: 'number' },
        cellRenderer: renderTokens,
        valueGetter: (p) => p.token_count,
      },
      activeChipColumn<AiPrompt>(),
      dateColumn<AiPrompt>(),
      actionsColumn<AiPrompt>({
        onEdit,
        onDelete,
        edit: { ariaLabel: (p) => `Edit ${p.name}` },
        delete: { ariaLabel: (p) => `Delete ${p.name}` },
      }),
    ],
    [onEdit, onDelete],
  );

  return (
    <DuncitTable<AiPrompt>
      tableId="ai-prompts"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPromptRowId}
      toolbarActions={toolbarActions}
      emptyText={'No prompts yet. Click "Add prompt" to create your first one.'}
      searchPlaceholder="Search by name, category or content…"
      refetchRef={refetchRef}
    />
  );
}
