import { useCallback, useMemo, type MutableRefObject, type ReactNode } from 'react';
import {
  DuncitTable,
  activeChipColumn,
  clientTableFetch,
  dateColumn,
  rowMenuColumn,
  type DuncitColumn,
  type TableQueryState,
} from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { usePromptCopy } from '../../i18n/useCopy';
import { useDetailCopy } from '../../i18n/useDetailCopy';
import { promptSearchText } from '../../search';
import type { AiPrompt, LibraryTab } from '../../types';
import { renderCategory, renderKey, renderModel, renderName, renderTokens } from './cells';
import { promptRowMenu, type PromptRowActions } from './rowMenu';

interface Props {
  tab: LibraryTab;
  /** The whole list of this tab; the table pages it in memory by its own column types. */
  load: () => Promise<AiPrompt[]>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  /**
   * Memoise it: the columns are built from it, the fetch from the columns, and
   * the table refetches whenever its fetch changes.
   */
  actions: PromptRowActions;
}

const getPromptRowId = (p: AiPrompt) => p.id;

/**
 * One table, three tabs. What differs is the row menu (see promptRowMenu): a
 * code row can be reset but never archived or deleted, because a call site goes
 * on reading it. Clicking a row opens its detail view.
 */
export function PromptsTable({ tab, load, refetchRef, toolbarActions, actions }: Readonly<Props>) {
  const copy = usePromptCopy();
  const more = useDetailCopy();
  const { t } = useTranslation();
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
      {
        field: 'total_hits',
        headerName: more.columns.hits,
        type: 'number',
        width: 100,
        valueGetter: (p) => p.total_hits ?? 0,
      },
      activeChipColumn<AiPrompt>(),
      dateColumn<AiPrompt>(),
      rowMenuColumn<AiPrompt>({
        ariaLabel: (p) => more.actions.menu(p.name),
        items: (p) => promptRowMenu(p, tab, more, actions),
      }),
    ],
    [tab, copy, more, defaultModel, t, actions],
  );

  const emptyText = { CODE: copy.emptyCode, AI: copy.emptyAi, ARCHIVED: more.tabs.emptyArchived }[tab];

  // Search, filters, sort and paging over the whole (small) list already here.
  const fetchRows = useCallback(
    async (q: TableQueryState) => clientTableFetch(await load(), promptSearchText, columns)(q),
    [load, columns],
  );

  return (
    <DuncitTable<AiPrompt>
      ariaLabel={t('ai.library.pageTitle')}
      tableId={`ai-prompts-${tab.toLowerCase()}`}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPromptRowId}
      onRowClick={actions.onOpen}
      toolbarActions={toolbarActions}
      emptyText={emptyText}
      searchPlaceholder={copy.searchPlaceholder}
      refetchRef={refetchRef}
    />
  );
}
