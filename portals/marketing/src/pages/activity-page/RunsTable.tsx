import { useMemo, type RefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { DuncitTable, useApolloTableFetch, type TableFilterValue } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { MARKETING_RUNS_TABLE, type MarketingRunRow } from './queries';
import { getRunColumns } from './runColumns';

const getRowId = (row: MarketingRunRow) => row.id;

interface Props {
  /** Keys the grid's remembered layout — one per page, so a pinned view keeps its own columns. */
  tableId?: string;
  /**
   * Page-level pins (a status, a workflow, the signed-in person) appended to
   * the grid's own filters. The grid refetches, from page 1, when they change.
   */
  extraFilters?: ReadonlyArray<TableFilterValue>;
  emptyText: string;
  onOpen: (run: MarketingRunRow) => void;
  refetchRef: RefObject<(() => void) | null>;
}

/**
 * Every run the server has, newest first, server-paged. Filter by type,
 * status, who ran it or what started it from the column menus; open a row
 * for its steps, the calls it made and the actions it allows.
 */
export default function RunsTable({
  tableId = 'marketing-runs',
  extraFilters,
  emptyText,
  onOpen,
  refetchRef,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<MarketingRunRow>(client, MARKETING_RUNS_TABLE, 'marketingRunsTable');
  const columns = useMemo(() => getRunColumns(t, formatDateTime, onOpen), [t, formatDateTime, onOpen]);

  return (
    <DuncitTable<MarketingRunRow>
      ariaLabel={t('marketing.runs.tableLabel')}
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      externalFilters={extraFilters}
      refetchRef={refetchRef}
      emptyText={emptyText}
      searchPlaceholder={t('marketing.runs.search')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
    />
  );
}
