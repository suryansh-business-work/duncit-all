import { useMemo } from 'react';
import type { RegressionCoverageDelta } from '@duncit/gql-types';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import ClientRowsTable from '../../unit/components/ClientRowsTable';
import { formatDelta, formatPct } from '../../unit/format';

type Metric = 'lines' | 'branches' | 'functions' | 'statements';

const getRowId = (row: RegressionCoverageDelta) => row.workspace;
const searchOf = (row: RegressionCoverageDelta) => row.workspace;

/** Coverage before and after, per workspace — the biggest drop first. */
export default function CoverageDeltaTable({ rows }: Readonly<{ rows: readonly RegressionCoverageDelta[] }>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<RegressionCoverageDelta>[]>(() => {
    const pair = (metric: Metric, label: string): DuncitColumn<RegressionCoverageDelta>[] => {
      const after = `${metric}_after` as const;
      const delta = `${metric}_delta` as const;
      return [
        { field: after, headerName: label, width: 120, type: 'number', valueGetter: (r) => formatPct(t, r[after]) },
        {
          field: delta,
          headerName: t('testsUnit.regression.col.change', { vars: { metric: label } }),
          width: 140,
          type: 'number',
          valueGetter: (r) => formatDelta(t, r[delta]),
        },
      ];
    };
    return [
      { field: 'workspace', headerName: t('testsUnit.col.workspace'), minWidth: 200, flex: 1, type: 'text', valueGetter: (r) => r.workspace },
      ...pair('lines', t('testsUnit.coverage.lines')),
      ...pair('branches', t('testsUnit.coverage.branches')),
      ...pair('functions', t('testsUnit.coverage.functions')),
      ...pair('statements', t('testsUnit.coverage.statements')),
    ];
  }, [t]);

  return (
    <ClientRowsTable<RegressionCoverageDelta>
      tableId="tests-regression-coverage"
      ariaLabel={t('testsUnit.regression.coverageTitle')}
      columns={columns}
      rows={rows}
      getRowId={getRowId}
      searchOf={searchOf}
      emptyText={t('testsUnit.coverage.empty')}
      searchPlaceholder={t('testsUnit.workspaces.search')}
      defaultSort={{ field: 'lines_delta', dir: 'asc' }}
    />
  );
}
