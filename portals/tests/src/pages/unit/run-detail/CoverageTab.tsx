import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import ClientRowsTable from '../components/ClientRowsTable';
import CoverageBar from '../components/CoverageBar';
import { formatPct } from '../format';
import type { UnitWorkspaceRow } from '../queries';

type MetricKey = 'lines' | 'branches' | 'functions' | 'statements';

const getRowId = (row: UnitWorkspaceRow) => row.name;
const searchOf = (row: UnitWorkspaceRow) => `${row.name} ${row.dir}`;

/** A coverage cell: the bar, named for a screen reader by metric and workspace. */
function makeCoverageCell(metric: MetricKey, labelOf: (workspace: string) => string) {
  const renderCoverage = (row: UnitWorkspaceRow) => (
    <CoverageBar pct={row.coverage?.[metric].pct} label={labelOf(row.name)} />
  );
  return renderCoverage;
}

/**
 * Coverage per workspace, least covered first — the order a reader looking
 * for where to add tests wants. Only workspaces that wrote a coverage report
 * are listed.
 */
export default function CoverageTab({ workspaces }: Readonly<{ workspaces: readonly UnitWorkspaceRow[] }>) {
  const { t } = useTranslation();
  const rows = useMemo(() => workspaces.filter((ws) => ws.coverage), [workspaces]);
  const columns = useMemo<DuncitColumn<UnitWorkspaceRow>[]>(() => {
    const metric = (key: MetricKey, label: string): DuncitColumn<UnitWorkspaceRow> => ({
      field: `coverage.${key}.pct`,
      headerName: label,
      minWidth: 170,
      flex: 1,
      type: 'number',
      cellRenderer: makeCoverageCell(key, (workspace) =>
        t('testsUnit.coverage.barLabel', { vars: { metric: label, workspace } })
      ),
      valueGetter: (r) => formatPct(t, r.coverage?.[key].pct),
    });
    return [
      { field: 'name', headerName: t('testsUnit.col.workspace'), minWidth: 200, flex: 1, type: 'text', valueGetter: (r) => r.name },
      metric('lines', t('testsUnit.coverage.lines')),
      metric('branches', t('testsUnit.coverage.branches')),
      metric('functions', t('testsUnit.coverage.functions')),
      metric('statements', t('testsUnit.coverage.statements')),
    ];
  }, [t]);

  return (
    <ClientRowsTable<UnitWorkspaceRow>
      tableId="tests-unit-run-coverage"
      ariaLabel={t('testsUnit.tabs.coverage')}
      columns={columns}
      rows={rows}
      getRowId={getRowId}
      searchOf={searchOf}
      emptyText={t('testsUnit.coverage.empty')}
      searchPlaceholder={t('testsUnit.workspaces.search')}
      defaultSort={{ field: 'coverage.lines.pct', dir: 'asc' }}
    />
  );
}
