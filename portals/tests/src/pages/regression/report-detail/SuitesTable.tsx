import { useMemo } from 'react';
import type { RegressionSuiteDelta } from '@duncit/gql-types';
import { useTranslation } from '@duncit/shell';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import ClientRowsTable from '../../unit/components/ClientRowsTable';
import { makeStatusCell } from '../../unit/components/StatusChip';

const getRowId = (row: RegressionSuiteDelta) => row.suite;
const searchOf = (row: RegressionSuiteDelta) => row.suite;

/** A signed count change, e.g. +3; a dash when neither run counted it. */
const signed = (n: number | null | undefined): string => {
  if (n == null) return EM_DASH;
  return n > 0 ? `+${n}` : String(n);
};

/** E2E suites side by side: status before and after, and how the counts moved. Changed suites first. */
export default function SuitesTable({ suites }: Readonly<{ suites: readonly RegressionSuiteDelta[] }>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<RegressionSuiteDelta>[]>(() => {
    // The E2E suite statuses: PASSED, FAILED, SKIPPED, RUNNING — and empty when the suite was not in that run.
    const statusLabels: Record<string, string> = {
      PASSED: t('testsUnit.status.passed'),
      FAILED: t('testsUnit.status.failed'),
      SKIPPED: t('testsUnit.status.skipped'),
      RUNNING: t('testsUnit.status.running'),
      '': t('testsUnit.regression.notInRun'),
    };
    return [
      { field: 'suite', headerName: t('testsUnit.regression.col.suite'), minWidth: 180, flex: 1, type: 'text', valueGetter: (r) => r.suite },
      {
        field: 'status_before',
        headerName: t('testsUnit.regression.col.before'),
        width: 140,
        type: 'text',
        cellRenderer: makeStatusCell<RegressionSuiteDelta>(statusLabels, (r) => r.status_before),
        valueGetter: (r) => statusLabels[r.status_before] ?? r.status_before,
      },
      {
        field: 'status_after',
        headerName: t('testsUnit.regression.col.after'),
        width: 140,
        type: 'text',
        cellRenderer: makeStatusCell<RegressionSuiteDelta>(statusLabels, (r) => r.status_after),
        valueGetter: (r) => statusLabels[r.status_after] ?? r.status_after,
      },
      {
        field: 'changed',
        headerName: t('testsUnit.regression.col.changed'),
        width: 110,
        type: 'boolean',
        valueGetter: (r) => (r.changed ? t('testsUnit.common.yes') : t('testsUnit.common.no')),
      },
      { field: 'passed_after', headerName: t('testsUnit.col.passed'), width: 95, type: 'number', valueGetter: (r) => r.passed_after ?? EM_DASH },
      { field: 'passed_delta', headerName: t('testsUnit.regression.col.passedChange'), width: 130, type: 'number', valueGetter: (r) => signed(r.passed_delta) },
      { field: 'failed_after', headerName: t('testsUnit.col.failed'), width: 95, type: 'number', valueGetter: (r) => r.failed_after ?? EM_DASH },
      { field: 'failed_delta', headerName: t('testsUnit.regression.col.failedChange'), width: 130, type: 'number', valueGetter: (r) => signed(r.failed_delta) },
    ];
  }, [t]);

  return (
    <ClientRowsTable<RegressionSuiteDelta>
      tableId="tests-regression-suites"
      ariaLabel={t('testsUnit.regression.suitesTitle')}
      columns={columns}
      rows={suites}
      getRowId={getRowId}
      searchOf={searchOf}
      emptyText={t('testsUnit.regression.noSuites')}
      searchPlaceholder={t('testsUnit.regression.searchSuites')}
      defaultSort={{ field: 'changed', dir: 'desc' }}
    />
  );
}
