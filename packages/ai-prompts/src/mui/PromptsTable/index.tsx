import { useCallback, useMemo, type MutableRefObject, type ReactNode } from 'react';
import {
  DuncitTable,
  actionsColumn,
  activeChipColumn,
  clientTableFetch,
  dateColumn,
  type DuncitColumn,
  type TableQueryState,
} from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { usePromptCopy } from '../../i18n/useCopy';
import { promptSearchText } from '../../search';
import type { AiPrompt, PromptKind } from '../../types';
import { ResetAction, renderCategory, renderKey, renderModel, renderName, renderTokens } from './cells';

interface Props {
  kind: PromptKind;
  /** The whole list of this kind; the table pages it in memory by its own column types. */
  load: () => Promise<AiPrompt[]>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (prompt: AiPrompt) => void;
  onDelete: (prompt: AiPrompt) => void;
  onReset: (prompt: AiPrompt) => void;
}

const getPromptRowId = (p: AiPrompt) => p.id;

/**
 * One table, both kinds. The columns differ only in what a code row cannot do:
 * it has no delete (its call site would go on reading a row that is gone) and
 * it alone offers a reset.
 */
export function PromptsTable({
  kind,
  load,
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
        type: 'text',
        flex: 1,
        minWidth: 240,
        cellRenderer: (p) => renderName(p, copy),
        valueGetter: (p) => p.name,
      },
      {
        field: 'key',
        headerName: copy.fields.key,
        type: 'text',
        minWidth: 190,
        cellRenderer: renderKey,
        valueGetter: (p) => p.key ?? '',
      },
      {
        field: 'category',
        headerName: copy.fields.category,
        type: 'text',
        minWidth: 130,
        cellRenderer: renderCategory,
        valueGetter: (p) => p.category,
      },
      {
        field: 'target_model',
        headerName: copy.fields.model,
        type: 'text',
        width: 150,
        cellRenderer: (p) => renderModel(p, defaultModel),
        valueGetter: (p) => p.target_model || defaultModel,
      },
      {
        field: 'token_count',
        headerName: t('ai.library.colTokens'),
        type: 'number',
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

  // Search, filters, sort and paging over the whole (small) list already here.
  const fetchRows = useCallback(
    async (q: TableQueryState) => clientTableFetch(await load(), promptSearchText, columns)(q),
    [load, columns],
  );

  return (
    <DuncitTable<AiPrompt>
      ariaLabel={t('ai.library.pageTitle')}
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
