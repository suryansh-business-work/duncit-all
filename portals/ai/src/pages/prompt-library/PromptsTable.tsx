import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
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
  onReset: (prompt: AiPrompt) => void;
}

const getPromptRowId = (p: AiPrompt) => p.id;

const SYSTEM_DELETE_HINT = 'System prompts power a shipped feature — reset instead of deleting';

const renderName = (p: AiPrompt) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Typography variant="body2" fontWeight={700} component="div">
        {p.name}
      </Typography>
      {p.is_system && (
        <Tooltip title={`Used by the app as "${p.key}"`}>
          <Chip size="small" color="secondary" variant="outlined" label="System" />
        </Tooltip>
      )}
    </Stack>
    {p.description && (
      <Typography variant="caption" color="text.secondary" component="div">
        {p.description}
      </Typography>
    )}
  </Box>
);

/** Reset-to-default action, shown only on system rows (which cannot be deleted). */
function ResetAction({ prompt, onReset }: Readonly<{ prompt: AiPrompt; onReset: (p: AiPrompt) => void }>) {
  return (
    <Tooltip title="Restore the shipped default">
      <IconButton size="small" aria-label={`Reset ${prompt.name}`} onClick={() => onReset(prompt)}>
        <RestartAltIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

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
  onReset,
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
        width: 140,
        onEdit,
        onDelete,
        renderExtra: (p) => (p.is_system ? <ResetAction prompt={p} onReset={onReset} /> : null),
        edit: { ariaLabel: (p) => `Edit ${p.name}` },
        delete: {
          ariaLabel: (p) => `Delete ${p.name}`,
          disabled: (p) => p.is_system,
          disabledTitle: SYSTEM_DELETE_HINT,
        },
      }),
    ],
    [onEdit, onDelete, onReset],
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
