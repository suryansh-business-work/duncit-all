import { useMemo, type MutableRefObject } from 'react';
import { useApolloClient } from '@apollo/client';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { getTranslationGroupColumns } from './translation-group-columns';
import { TRANSLATION_GROUPS, type LocaleRow, type TranslationGroupRow } from './queries';
import { useTranslation } from '@duncit/shell';

const getRowId = (row: TranslationGroupRow) => row.id;

interface Props {
  locales: ReadonlyArray<LocaleRow>;
  onOpen: (row: TranslationGroupRow) => void;
  refetchRef: MutableRefObject<(() => void) | null>;
}

/**
 * Level one of Translations: the namespaces themselves. Counts come from the
 * server aggregation, so this stays one small page however far the catalogue
 * grows; clicking a row drills into that namespace's entries.
 */
export default function TranslationGroupsTable({
  locales,
  onOpen,
  refetchRef,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<TranslationGroupRow>(
    client,
    TRANSLATION_GROUPS,
    'translationGroups',
  );
  const columns = useMemo(() => getTranslationGroupColumns(locales, t), [locales, t]);

  return (
    <DuncitTable<TranslationGroupRow>
      tableId="admin-translation-groups"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText={t('admin.localization.namespacesEmpty')}
      defaultSort={{ field: 'surface', dir: 'asc' }}
      searchPlaceholder="Search portal or page"
      refetchRef={refetchRef}
    />
  );
}
