import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitTable, EM_DASH, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { makeStatusCell } from '../../unit/components/StatusChip';
import { formatDelta } from '../../unit/format';
import { optionsOf } from '../../unit/labels';
import { REGRESSION_REPORTS_TABLE, type RegressionReportRow } from '../queries';
import { useRegressionLabels } from '../labels';

const getRowId = (row: RegressionReportRow) => row.id;

/** Not stored as columns the server can order or match on — shown only. */
const SHOWN_ONLY = { sortable: false, filterable: false } as const;

/** Every READY regression report, newest first. */
export default function ReportsTable({ onRowClick }: Readonly<{ onRowClick: (row: RegressionReportRow) => void }>) {
  const { t } = useTranslation();
  const labels = useRegressionLabels();
  const dates = useDateFormat({ timeZoneAware: true });
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<RegressionReportRow>(client, REGRESSION_REPORTS_TABLE, 'regressionReportsTable');

  const columns = useMemo<DuncitColumn<RegressionReportRow>[]>(
    () => [
      dateColumn<RegressionReportRow>({
        field: 'created_at',
        headerName: t('testsUnit.col.when'),
        width: 175,
        hide: false,
        formatDate: (date) => dates.formatDateTime(date),
      }),
      {
        field: 'kind',
        headerName: t('testsUnit.regression.col.kind'),
        width: 110,
        type: 'enum',
        options: optionsOf(labels.kind),
        valueGetter: (r) => labels.kind[r.kind],
      },
      {
        field: 'status',
        headerName: t('testsUnit.col.status'),
        width: 130,
        type: 'enum',
        options: optionsOf(labels.status),
        cellRenderer: makeStatusCell<RegressionReportRow>(labels.status, (r) => r.status),
        valueGetter: (r) => labels.status[r.status],
      },
      { field: 'run_no', headerName: t('testsUnit.col.run'), width: 150, type: 'text', valueGetter: (r) => r.run_no },
      {
        field: 'base_run_no',
        headerName: t('testsUnit.regression.col.comparedWith'),
        width: 160,
        type: 'text',
        ...SHOWN_ONLY,
        valueGetter: (r) => r.base_run_no || EM_DASH,
      },
      { field: 'branch', headerName: t('testsUnit.col.branch'), width: 110, type: 'text', valueGetter: (r) => r.branch },
      {
        field: 'regressed',
        headerName: labels.bucket.REGRESSED,
        width: 115,
        type: 'number',
        valueGetter: (r) => r.counts.regressed,
      },
      {
        field: 'new_failing',
        headerName: labels.bucket.NEW_FAILING,
        width: 120,
        type: 'number',
        valueGetter: (r) => r.counts.new_failing,
      },
      { field: 'fixed', headerName: labels.bucket.FIXED, width: 100, type: 'number', valueGetter: (r) => r.counts.fixed },
      {
        field: 'still_failing',
        headerName: labels.bucket.STILL_FAILING,
        width: 125,
        type: 'number',
        ...SHOWN_ONLY,
        valueGetter: (r) => r.counts.still_failing,
      },
      {
        field: 'new_tests',
        headerName: labels.bucket.NEW_TESTS,
        width: 110,
        type: 'number',
        ...SHOWN_ONLY,
        valueGetter: (r) => r.counts.new_tests,
      },
      {
        field: 'removed_tests',
        headerName: labels.bucket.REMOVED_TESTS,
        width: 120,
        type: 'number',
        ...SHOWN_ONLY,
        valueGetter: (r) => r.counts.removed_tests,
      },
      {
        field: 'coverage_total',
        headerName: t('testsUnit.regression.col.linesDelta'),
        width: 130,
        type: 'number',
        ...SHOWN_ONLY,
        valueGetter: (r) => formatDelta(t, r.coverage_total?.lines_delta),
      },
    ],
    [dates, labels, t]
  );

  return (
    <DuncitTable<RegressionReportRow>
      ariaLabel={t('testsUnit.regression.title')}
      tableId="tests-regression-reports"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('testsUnit.regression.empty')}
      searchPlaceholder={t('testsUnit.regression.search')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      onRowClick={onRowClick}
    />
  );
}
