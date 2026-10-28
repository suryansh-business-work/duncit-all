import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import ClientRowsTable from '../components/ClientRowsTable';
import { makeStatusCell } from '../components/StatusChip';
import { formatDuration, formatPct } from '../format';
import { optionsOf, useUnitLabels } from '../labels';
import type { UnitWorkspaceRow } from '../queries';

const getRowId = (row: UnitWorkspaceRow) => row.name;
const searchOf = (row: UnitWorkspaceRow) => `${row.name} ${row.dir} ${row.group}`;

/** One row per workspace the run covered: how its suites went and what they cover. */
export default function WorkspacesTab({ workspaces }: Readonly<{ workspaces: readonly UnitWorkspaceRow[] }>) {
  const { t } = useTranslation();
  const labels = useUnitLabels();
  const columns = useMemo<DuncitColumn<UnitWorkspaceRow>[]>(
    () => [
      { field: 'name', headerName: t('testsUnit.col.workspace'), minWidth: 200, flex: 1, type: 'text', valueGetter: (r) => r.name },
      { field: 'group', headerName: t('testsUnit.col.group'), width: 140, type: 'text', valueGetter: (r) => r.group },
      {
        field: 'runner',
        headerName: t('testsUnit.col.runner'),
        width: 110,
        type: 'enum',
        options: optionsOf(labels.runner),
        valueGetter: (r) => labels.runner[r.runner],
      },
      {
        field: 'status',
        headerName: t('testsUnit.col.status'),
        width: 130,
        type: 'enum',
        options: optionsOf(labels.workspaceStatus),
        cellRenderer: makeStatusCell<UnitWorkspaceRow>(labels.workspaceStatus, (r) => r.status, (r) => r.error),
        valueGetter: (r) => labels.workspaceStatus[r.status],
      },
      { field: 'tests', headerName: t('testsUnit.col.tests'), width: 95, type: 'number', valueGetter: (r) => r.tests },
      { field: 'passed', headerName: t('testsUnit.col.passed'), width: 95, type: 'number', valueGetter: (r) => r.passed },
      { field: 'failed', headerName: t('testsUnit.col.failed'), width: 95, type: 'number', valueGetter: (r) => r.failed },
      { field: 'skipped', headerName: t('testsUnit.col.skipped'), width: 95, type: 'number', valueGetter: (r) => r.skipped },
      {
        field: 'suites_failed',
        headerName: t('testsUnit.col.failingFiles'),
        width: 120,
        type: 'number',
        valueGetter: (r) => r.suites_failed,
      },
      {
        field: 'duration_ms',
        headerName: t('testsUnit.col.duration'),
        width: 110,
        type: 'number',
        valueGetter: (r) => formatDuration(t, r.duration_ms),
      },
      {
        field: 'coverage.lines.pct',
        headerName: t('testsUnit.col.linesCoverage'),
        width: 130,
        type: 'number',
        valueGetter: (r) => formatPct(t, r.coverage?.lines.pct),
      },
    ],
    [labels, t]
  );

  return (
    <ClientRowsTable<UnitWorkspaceRow>
      tableId="tests-unit-run-workspaces"
      ariaLabel={t('testsUnit.tabs.workspaces')}
      columns={columns}
      rows={workspaces}
      getRowId={getRowId}
      searchOf={searchOf}
      emptyText={t('testsUnit.workspaces.empty')}
      searchPlaceholder={t('testsUnit.workspaces.search')}
      defaultSort={{ field: 'failed', dir: 'desc' }}
    />
  );
}
