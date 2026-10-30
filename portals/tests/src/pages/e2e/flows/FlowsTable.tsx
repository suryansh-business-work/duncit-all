import { useMemo, type ReactNode, type RefObject } from 'react';
import { useTranslation } from '@duncit/shell';
import {
  DuncitTable,
  actionsColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import { getRowId, namedActions, renderFailedCell, renderNameCell, renderPassedCell, runCountText } from './cells';
import type { E2eFlowRow } from './queries';

interface Props {
  fetchRows: TableFetch<E2eFlowRow>;
  refetchRef: RefObject<(() => void) | null>;
  toolbarActions: ReactNode;
  onOpen: (row: E2eFlowRow) => void;
  onEdit: (row: E2eFlowRow) => void;
  onDelete: (row: E2eFlowRow) => void;
}

export default function FlowsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onOpen,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<E2eFlowRow>[]>(
    () => [
      {
        field: 'name',
        headerName: t('shell.common.name'),
        flex: 1,
        minWidth: 260,
        type: 'text',
        cellRenderer: renderNameCell,
        valueGetter: (row) => row.name,
      },
      {
        field: 'sub_flow_count',
        headerName: t('tech.e2eFlows.colSubFlows'),
        width: 120,
        type: 'number',
        // The length of the embedded sub_flows array, computed per row at read
        // time — a Mongo find() can neither order nor range-match on it.
        sortable: false,
        filterable: false,
        valueGetter: (row) => String(row.sub_flow_count),
      },
      {
        // How much of the flow is reviewed and ready for e2e — counted per row
        // at read time, like the sub flow count.
        field: 'looks_good_count',
        headerName: t('tech.e2eFlows.colLooksGood'),
        width: 130,
        type: 'number',
        sortable: false,
        filterable: false,
        valueGetter: (row) => `${row.looks_good_count} / ${row.sub_flow_count}`,
      },
      // How the flow's specs did across the recorded E2E runs — counted per
      // page at read time from the scenario rows, so not sortable either.
      {
        field: 'run_stats_runs',
        headerName: t('tech.e2eFlows.colRuns'),
        width: 100,
        type: 'number',
        sortable: false,
        filterable: false,
        valueGetter: (row) => runCountText(row, (stats) => stats.runs),
      },
      {
        field: 'run_stats_passed',
        headerName: t('tech.e2eFlows.colPassed'),
        width: 110,
        type: 'number',
        sortable: false,
        filterable: false,
        cellRenderer: renderPassedCell,
        valueGetter: (row) => runCountText(row, (stats) => stats.passed),
      },
      {
        field: 'run_stats_failed',
        headerName: t('tech.e2eFlows.colFailed'),
        width: 110,
        type: 'number',
        sortable: false,
        filterable: false,
        cellRenderer: renderFailedCell,
        valueGetter: (row) => runCountText(row, (stats) => stats.failed),
      },
      dateColumn<E2eFlowRow>({
        field: 'updated_at',
        headerName: t('shell.common.updated'),
        hide: false,
        width: 165,
      }),
      actionsColumn<E2eFlowRow>({ width: 120, onEdit, onDelete, ...namedActions(t) }),
    ],
    [t, onEdit, onDelete]
  );

  return (
    <DuncitTable<E2eFlowRow>
      ariaLabel={t('tech.e2eFlows.title')}
      tableId="tech-e2e-flows"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.e2eFlows.empty')}
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      searchPlaceholder={t('tech.e2eFlows.searchPlaceholder')}
      toolbarActions={toolbarActions}
      refetchRef={refetchRef}
      onRowClick={onOpen}
    />
  );
}
