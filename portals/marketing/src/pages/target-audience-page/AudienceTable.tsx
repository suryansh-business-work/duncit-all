import { useMemo, type MutableRefObject } from 'react';
import { DuncitTable, type TableFetch, type TableFilterValue } from '@duncit/table';
import { getAudienceColumns, type AudienceColumnDeps } from './columns';
import type { AudienceRow } from './helpers';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  fetchRows: TableFetch<AudienceRow>;
  refetchRef?: MutableRefObject<(() => void) | null>;
  /** Memoized by the page — the date format for the two date columns, and the
   * row action, which only a saved list's detail page supplies. */
  columnDeps: AudienceColumnDeps;
  /** Everything the sidebar has selected. Filtering lives there, not in the
   * column popovers, so a change here resets to page 1 and refetches. Omitted
   * by a saved list's detail page, whose membership the server already
   * resolved. */
  externalFilters?: TableFilterValue[];
}

const getRowId = (row: AudienceRow) => row.id;

export default function AudienceTable({
  fetchRows,
  refetchRef,
  columnDeps,
  externalFilters,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo(() => getAudienceColumns(columnDeps, t), [t, columnDeps]);

  return (
    <DuncitTable<AudienceRow>
      tableId="marketing-target-audience"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      refetchRef={refetchRef}
      externalFilters={externalFilters}
      emptyText={t('marketing.targetAudience.noOneMatchesTheseFilters')}
      searchPlaceholder="Search by name, email or phone"
      defaultSort={{ field: 'created_at', dir: 'desc' }}
    />
  );
}
