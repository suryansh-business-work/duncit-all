import { useMemo, type MutableRefObject } from 'react';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import {
  getRowId,
  makeRenderLinks,
  makeRenderSlack,
  makeRenderStatus,
  makeRenderTriggeredBy,
  makeStatusOptions,
  makeTriggerOptions,
  renderIdentity,
  renderSuites,
} from './cells';
import { durationLabel, suitesLabel, testsLabel, type E2eRunRow } from './queries';

interface Props {
  fetchRows: TableFetch<E2eRunRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onRowClick: (row: E2eRunRow) => void;
  onDelete: (row: E2eRunRow) => void;
}

export default function E2eRunsTable({
  fetchRows,
  refetchRef,
  onRowClick,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<E2eRunRow>[]>(() => {
    const statusLabels = {
      QUEUED: t('tech.e2e.statusQueued'),
      RUNNING: t('tech.e2e.statusRunning'),
      SUCCESS: t('tech.e2e.statusSuccess'),
      FAILED: t('tech.e2e.statusFailed'),
      stale: t('tech.e2e.statusStale'),
      elapsed: (minutes: string) => t('tech.e2e.statusElapsed', { vars: { minutes } }),
    };
    const triggerLabels = {
      SCHEDULE: t('tech.e2e.triggerSchedule'),
      PORTAL: t('tech.e2e.triggerPortal'),
      MANUAL: t('tech.e2e.triggerManual'),
    };
    return [
      dateColumn<E2eRunRow>({
        field: 'created_at',
        headerName: t('tech.e2e.colWhen'),
        width: 165,
        // dateColumn defaults to hidden (built for audit tables); this one IS
        // the table's primary timestamp and its default sort.
        hide: false,
      }),
      {
        field: 'run_no',
        headerName: t('tech.e2e.colRun'),
        width: 140,
        filter: { type: 'text' },
        valueGetter: (row) => row.run_no,
      },
      {
        field: 'status',
        headerName: t('tech.e2e.colStatus'),
        width: 115,
        filter: { type: 'select', options: makeStatusOptions(statusLabels) },
        cellRenderer: makeRenderStatus(statusLabels),
        valueGetter: (row) => row.status,
      },
      {
        field: 'results',
        headerName: t('tech.e2e.colSuites'),
        minWidth: 180,
        sortable: false,
        cellRenderer: renderSuites,
        valueGetter: suitesLabel,
      },
      {
        field: 'totals',
        headerName: t('tech.e2e.colTests'),
        width: 120,
        sortable: false,
        valueGetter: testsLabel,
      },
      {
        field: 'duration_seconds',
        headerName: t('tech.e2e.colDuration'),
        width: 100,
        valueGetter: durationLabel,
      },
      {
        field: 'ref',
        headerName: t('tech.e2e.colBranch'),
        width: 120,
        filter: { type: 'text' },
        valueGetter: (row) => row.ref || '—',
      },
      {
        field: 'triggered_by',
        headerName: t('tech.e2e.colTriggeredBy'),
        minWidth: 190,
        filter: { type: 'select', options: makeTriggerOptions(triggerLabels) },
        cellRenderer: makeRenderTriggeredBy(triggerLabels),
        valueGetter: (row) => row.triggered_by || '—',
      },
      {
        field: 'signup_email',
        headerName: t('tech.e2e.colIdentity'),
        minWidth: 220,
        sortable: false,
        cellRenderer: renderIdentity,
        valueGetter: (row) => row.signup_email || '—',
      },
      {
        field: 'reported_by',
        headerName: t('tech.e2e.colReportedBy'),
        minWidth: 180,
        hide: true,
        valueGetter: (row) => row.reported_by || '—',
      },
      {
        field: 'slack_ts',
        headerName: t('tech.e2e.colSlack'),
        width: 105,
        sortable: false,
        cellRenderer: makeRenderSlack(t('tech.e2e.slackPosted'), t('tech.e2e.slackSkipped')),
        valueGetter: (row) => (row.slack_ts ? 'posted' : 'skipped'),
      },
      {
        field: 'workflow_run_url',
        headerName: t('tech.e2e.colLinks'),
        width: 110,
        sortable: false,
        cellRenderer: makeRenderLinks(
          {
            run: t('tech.e2e.viewRun'),
            runPending: t('tech.e2e.runLinkPending'),
            delete: t('tech.e2e.deleteAction'),
          },
          onDelete
        ),
        valueGetter: (row) => row.workflow_run_url,
      },
    ];
  }, [t, onDelete]);

  return (
    <DuncitTable<E2eRunRow>
      tableId="tech-e2e-runs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.e2e.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('tech.e2e.searchPlaceholder')}
      refetchRef={refetchRef}
      onRowClick={onRowClick}
    />
  );
}
