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
import { PROMPT_COPY } from '../copy';
import type { AiPrompt, PromptKind } from '../types';

interface Props {
  kind: PromptKind;
  fetchRows: TableFetch<AiPrompt>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (prompt: AiPrompt) => void;
  onDelete: (prompt: AiPrompt) => void;
  onReset: (prompt: AiPrompt) => void;
}

const getPromptRowId = (p: AiPrompt) => p.id;

const renderName = (p: AiPrompt) => (
  <Box sx={{ lineHeight: 1.3, py: 0.5 }}>
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Typography variant="body2" fontWeight={700} component="div">
        {p.name}
      </Typography>
      <Chip
        size="small"
        variant="outlined"
        color={p.role === 'USER' ? 'info' : 'secondary'}
        label={PROMPT_COPY.roles[p.role]}
      />
    </Stack>
    {p.description && (
      <Typography variant="caption" color="text.secondary" component="div">
        {p.description}
      </Typography>
    )}
  </Box>
);

/** The feed address. Monospaced because it is copied into a URL, not read as prose. */
const renderKey = (p: AiPrompt) => (
  <Typography variant="caption" fontFamily="monospace" color="text.secondary">
    {p.key}
  </Typography>
);

/** Reset-to-default, on code rows only — they are the ones with a default to go back to. */
function ResetAction({
  prompt,
  onReset,
}: Readonly<{ prompt: AiPrompt; onReset: (p: AiPrompt) => void }>) {
  return (
    <Tooltip title={PROMPT_COPY.resetHint}>
      <IconButton size="small" aria-label={`Reset ${prompt.name}`} onClick={() => onReset(prompt)}>
        <RestartAltIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

const renderCategory = (p: AiPrompt) => <Chip size="small" variant="outlined" label={p.category} />;

const renderModel = (p: AiPrompt) => (
  <Typography variant="body2" color={p.target_model ? 'text.primary' : 'text.disabled'}>
    {p.target_model || 'Default'}
  </Typography>
);

const renderTokens = (p: AiPrompt) => (
  <Tooltip title="Estimated token size of the prompt content">
    <Chip size="small" color="primary" variant="outlined" label={`≈ ${p.token_count}`} />
  </Tooltip>
);

/**
 * One table, both kinds. The columns differ only in what a code row cannot do:
 * it has no delete (its call site would go on reading a row that is gone) and
 * it alone offers a reset.
 */
export function PromptsTable({
  kind,
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
  onReset,
}: Readonly<Props>) {
  const code = kind === 'CODE';
  const columns = useMemo<DuncitColumn<AiPrompt>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 240,
        cellRenderer: renderName,
        valueGetter: (p) => p.name,
      },
      {
        field: 'key',
        headerName: 'Key',
        minWidth: 190,
        cellRenderer: renderKey,
        valueGetter: (p) => p.key ?? '',
      },
      {
        field: 'category',
        headerName: 'Category',
        minWidth: 130,
        cellRenderer: renderCategory,
        valueGetter: (p) => p.category,
      },
      {
        field: 'target_model',
        headerName: 'Model',
        width: 150,
        cellRenderer: renderModel,
        valueGetter: (p) => p.target_model || 'Default',
      },
      {
        field: 'token_count',
        headerName: 'Tokens',
        width: 110,
        cellRenderer: renderTokens,
        valueGetter: (p) => p.token_count,
      },
      activeChipColumn<AiPrompt>(),
      dateColumn<AiPrompt>(),
      actionsColumn<AiPrompt>({
        width: 140,
        onEdit,
        onDelete,
        renderExtra: (p) => (code ? <ResetAction prompt={p} onReset={onReset} /> : null),
        edit: { ariaLabel: (p) => `Edit ${p.name}` },
        delete: {
          ariaLabel: (p) => `Delete ${p.name}`,
          disabled: () => code,
          disabledTitle: PROMPT_COPY.codeDeleteHint,
        },
      }),
    ],
    [code, onEdit, onDelete, onReset],
  );

  return (
    <DuncitTable<AiPrompt>
      tableId={`ai-prompts-${kind.toLowerCase()}`}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPromptRowId}
      toolbarActions={toolbarActions}
      emptyText={code ? PROMPT_COPY.emptyCode : PROMPT_COPY.emptyAi}
      searchPlaceholder={PROMPT_COPY.searchPlaceholder}
      refetchRef={refetchRef}
    />
  );
}
