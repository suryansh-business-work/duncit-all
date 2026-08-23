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
import { useTranslation } from '@duncit/app-settings';
import { usePromptCopy } from '../i18n/useCopy';
import type { PromptCopy } from '../copy';
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

const renderName = (p: AiPrompt, copy: PromptCopy) => (
  <Box sx={{ lineHeight: 1.3, py: 0.5 }}>
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Typography variant="body2" fontWeight={700} component="div">
        {p.name}
      </Typography>
      <Chip
        size="small"
        variant="outlined"
        color={p.role === 'USER' ? 'info' : 'secondary'}
        label={copy.roles[p.role]}
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
  const copy = usePromptCopy();
  const { t } = useTranslation();
  return (
    <Tooltip title={copy.resetHint}>
      <IconButton
        size="small"
        aria-label={t('ai.library.resetAria', { vars: { name: prompt.name } })}
        onClick={() => onReset(prompt)}
      >
        <RestartAltIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

const renderCategory = (p: AiPrompt) => <Chip size="small" variant="outlined" label={p.category} />;

const renderModel = (p: AiPrompt, defaultModel: string) => (
  <Typography variant="body2" color={p.target_model ? 'text.primary' : 'text.disabled'}>
    {p.target_model || defaultModel}
  </Typography>
);

const renderTokens = (p: AiPrompt, hint: string) => (
  <Tooltip title={hint}>
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
  const copy = usePromptCopy();
  const { t } = useTranslation();
  const code = kind === 'CODE';
  const defaultModel = t('ai.library.defaultModel');
  // Rebuilt when the catalogue changes — a column set frozen at module load
  // would keep the language the console first rendered in.
  const columns = useMemo<DuncitColumn<AiPrompt>[]>(
    () => [
      {
        field: 'name',
        headerName: copy.fields.name,
        flex: 1,
        minWidth: 240,
        cellRenderer: (p) => renderName(p, copy),
        valueGetter: (p) => p.name,
      },
      {
        field: 'key',
        headerName: copy.fields.key,
        minWidth: 190,
        cellRenderer: renderKey,
        valueGetter: (p) => p.key ?? '',
      },
      {
        field: 'category',
        headerName: copy.fields.category,
        minWidth: 130,
        cellRenderer: renderCategory,
        valueGetter: (p) => p.category,
      },
      {
        field: 'target_model',
        headerName: copy.fields.model,
        width: 150,
        cellRenderer: (p) => renderModel(p, defaultModel),
        valueGetter: (p) => p.target_model || defaultModel,
      },
      {
        field: 'token_count',
        headerName: t('ai.library.colTokens'),
        width: 110,
        cellRenderer: (p) => renderTokens(p, t('ai.library.tokensHint')),
        valueGetter: (p) => p.token_count,
      },
      activeChipColumn<AiPrompt>(),
      dateColumn<AiPrompt>(),
      actionsColumn<AiPrompt>({
        width: 140,
        onEdit,
        onDelete,
        renderExtra: (p) => (code ? <ResetAction prompt={p} onReset={onReset} /> : null),
        edit: { ariaLabel: (p) => t('ai.library.editAria', { vars: { name: p.name } }) },
        delete: {
          ariaLabel: (p) => t('ai.library.deleteAria', { vars: { name: p.name } }),
          disabled: () => code,
          disabledTitle: copy.codeDeleteHint,
        },
      }),
    ],
    [code, copy, defaultModel, t, onEdit, onDelete, onReset],
  );

  return (
    <DuncitTable<AiPrompt>
      tableId={`ai-prompts-${kind.toLowerCase()}`}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPromptRowId}
      toolbarActions={toolbarActions}
      emptyText={code ? copy.emptyCode : copy.emptyAi}
      searchPlaceholder={copy.searchPlaceholder}
      refetchRef={refetchRef}
    />
  );
}
