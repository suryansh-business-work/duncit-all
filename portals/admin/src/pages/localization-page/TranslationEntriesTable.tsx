import { useMemo, type MutableRefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { DuncitTable, useApolloTableFetch, type TableFilterValue } from '@duncit/table';
import { getTranslationColumns } from './translation-columns';
import { TRANSLATIONS_TABLE, type LocaleRow, type TranslationRow } from './queries';
import { useTranslation } from '@duncit/shell';

const getRowId = (row: TranslationRow) => row.id;

interface Props {
  surface: string;
  page: string;
  locales: LocaleRow[];
  formatDateTime: (value: string) => string;
  onOpen: (row: TranslationRow) => void;
  refetchRef: MutableRefObject<(() => void) | null>;
}

/**
 * Level two: the same entries table as before, pinned to one namespace. The
 * pair rides in as EXTERNAL filters — the server's translationsTable already
 * allowlists surface and page — so the toolbar's own filter chips stay free for
 * whatever the translator filters on next.
 */
export default function TranslationEntriesTable({
  surface,
  page,
  locales,
  formatDateTime,
  onOpen,
  refetchRef,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<TranslationRow>(
    client,
    TRANSLATIONS_TABLE,
    'translationsTable',
  );
  const columns = useMemo(
    () => getTranslationColumns({ locales, formatDateTime, t }),
    [locales, formatDateTime],
  );
  const externalFilters = useMemo<TableFilterValue[]>(
    () => [
      { field: 'surface', op: 'eq', value: surface },
      { field: 'page', op: 'eq', value: page },
    ],
    [surface, page],
  );

  return (
    <DuncitTable<TranslationRow>
      tableId="admin-translations"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText={t('admin.localization.entriesEmpty')}
      defaultSort={{ field: 'key', dir: 'asc' }}
      searchPlaceholder="Search key or description"
      refetchRef={refetchRef}
      externalFilters={externalFilters}
    />
  );
}
