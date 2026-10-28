import { useMemo, type MutableRefObject } from 'react';
import { useTranslation } from '@duncit/shell';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatDuration, formatPct } from '../format';
import { optionsOf, useUnitLabels } from '../labels';
import type { UnitRunRow } from '../queries';
import { makeStatusCell } from '../components/StatusChip';
import { getRunRowId, makeGithubCell, renderCommit } from './cells';

interface Props {
  fetchRows: TableFetch<UnitRunRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onRowClick: (row: UnitRunRow) => void;
}

/** Every unit run, newest first. Each column sorts and filters on the server. */
export default function RunsTable({ fetchRows, refetchRef, onRowClick }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useUnitLabels();
  const dates = useDateFormat({ timeZoneAware: true });

  const columns = useMemo<DuncitColumn<UnitRunRow>[]>(
    () => [
      dateColumn<UnitRunRow>({
        field: 'created_at',
        headerName: t('testsUnit.col.when'),
        width: 175,
        // dateColumn hides by default (built for audit tables); here it is the
        // table's primary timestamp and its default sort.
        hide: false,
        formatDate: (date) => dates.formatDateTime(date),
      }),
      { field: 'run_no', headerName: t('testsUnit.col.run'), width: 150, type: 'text', valueGetter: (r) => r.run_no },
      {
        field: 'status',
        headerName: t('testsUnit.col.status'),
        width: 130,
        type: 'enum',
        options: optionsOf(labels.runStatus),
        cellRenderer: makeStatusCell<UnitRunRow>(labels.runStatus, (r) => r.status, (r) => r.error_message),
        valueGetter: (r) => labels.runStatus[r.status],
      },
      {
        field: 'trigger',
        headerName: t('testsUnit.col.trigger'),
        width: 140,
        type: 'enum',
        options: optionsOf(labels.trigger),
        valueGetter: (r) => labels.trigger[r.trigger],
      },
      {
        field: 'workflow',
        headerName: t('testsUnit.col.workflow'),
        width: 150,
        type: 'enum',
        options: optionsOf(labels.workflow),
        valueGetter: (r) => labels.workflow[r.workflow],
      },
      { field: 'branch', headerName: t('testsUnit.col.branch'), width: 110, type: 'text', valueGetter: (r) => r.branch },
      {
        field: 'commit_sha',
        headerName: t('testsUnit.col.commit'),
        width: 110,
        type: 'text',
        cellRenderer: renderCommit,
        valueGetter: (r) => r.commit_sha,
      },
      {
        field: 'duration_ms',
        headerName: t('testsUnit.col.duration'),
        width: 115,
        type: 'number',
        valueGetter: (r) => formatDuration(t, r.duration_ms),
      },
      { field: 'passed', headerName: t('testsUnit.col.passed'), width: 100, type: 'number', valueGetter: (r) => r.totals.passed },
      { field: 'failed', headerName: t('testsUnit.col.failed'), width: 100, type: 'number', valueGetter: (r) => r.totals.failed },
      { field: 'skipped', headerName: t('testsUnit.col.skipped'), width: 100, type: 'number', valueGetter: (r) => r.totals.skipped },
      {
        field: 'lines_pct',
        headerName: t('testsUnit.col.linesCoverage'),
        width: 130,
        type: 'number',
        valueGetter: (r) => formatPct(t, r.lines_pct),
      },
      {
        field: 'triggered_by',
        headerName: t('testsUnit.col.triggeredBy'),
        minWidth: 180,
        hide: true,
        type: 'text',
        filterable: false,
        sortable: false,
        valueGetter: (r) => r.triggered_by,
      },
      {
        field: 'github_run_url',
        headerName: t('testsUnit.col.github'),
        width: 100,
        type: 'actions',
        cellRenderer: makeGithubCell(t('testsUnit.runs.openGithub'), t('testsUnit.runs.githubPending')),
        valueGetter: (r) => r.github_run_url,
      },
    ],
    [dates, labels, t]
  );

  return (
    <DuncitTable<UnitRunRow>
      ariaLabel={t('testsUnit.runs.title')}
      tableId="tests-unit-runs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRunRowId}
      emptyText={t('testsUnit.runs.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('testsUnit.runs.search')}
      refetchRef={refetchRef}
      onRowClick={onRowClick}
    />
  );
}
