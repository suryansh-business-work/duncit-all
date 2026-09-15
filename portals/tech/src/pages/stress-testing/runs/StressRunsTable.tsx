import { useMemo, type MutableRefObject } from 'react';
import { Stack, Tooltip } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { EnvironmentChip, RunStatusChip } from '../components/RunStatusChip';
import { isLiveRun, type StressRun, type StressRunStatus } from '../queries';
import {
  environmentOptions,
  formatCount,
  formatMs,
  formatPct,
  formatRps,
  formatSeconds,
  statusLabel,
} from '../labels';

interface Props {
  fetchRows: TableFetch<StressRun>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onRowClick: (row: StressRun) => void;
  onDelete: (row: StressRun) => void;
}

const STATUSES: StressRunStatus[] = ['QUEUED', 'RUNNING', 'STOPPING', 'COMPLETED', 'ABORTED', 'FAILED'];

const getRowId = (row: StressRun) => row.id;
const renderStatus = (row: StressRun) => <RunStatusChip status={row.status} />;
const renderEnvironment = (row: StressRun) => <EnvironmentChip environment={row.environment} />;

/** The load a run asked for, e.g. "300 users · 4 bots · 2 runners". */
const loadLabel = (row: StressRun) =>
  `${row.profile.virtual_users} · ${row.profile.browser_bots} · ${row.profile.runners}`;

interface ActionLabels {
  openRun: string;
  delete: string;
}

function makeRenderActions(labels: ActionLabels, onDelete: (row: StressRun) => void) {
  const renderActions = (row: StressRun) => (
    <Stack direction="row" spacing={0.5}>
      {row.workflow_run_url && (
        <Tooltip title={labels.openRun}>
          <DuncitIconButton
            size="small"
            aria-label={labels.openRun}
            href={row.workflow_run_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            <OpenInNewIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      )}
      {!isLiveRun(row.status) && (
        <Tooltip title={labels.delete}>
          <DuncitIconButton
            size="small"
            aria-label={labels.delete}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(row);
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      )}
    </Stack>
  );
  return renderActions;
}

/** Every stress run, newest first. The row opens the run's live page. */
export default function StressRunsTable({ fetchRows, refetchRef, onRowClick, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<StressRun>[]>(
    () => [
      dateColumn<StressRun>({ field: 'created_at', headerName: t('tech.stress.colWhen'), width: 165, hide: false }),
      { field: 'run_no', headerName: t('tech.stress.colRun'), width: 150, type: 'text', valueGetter: (row) => row.run_no },
      {
        field: 'status',
        headerName: t('tech.stress.colStatus'),
        width: 130,
        type: 'enum',
        options: STATUSES.map((s) => ({ value: s, label: statusLabel(t, s) })),
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'environment',
        headerName: t('tech.stress.colEnvironment'),
        width: 130,
        type: 'enum',
        options: environmentOptions(t),
        cellRenderer: renderEnvironment,
        valueGetter: (row) => row.environment,
      },
      // The server maps each numeric column below to its stored path
      // (profile.virtual_users, summary.requests, peaks.rps, …).
      { field: 'profile', headerName: t('tech.stress.colLoad'), width: 150, type: 'number', valueGetter: loadLabel },
      {
        field: 'duration_seconds',
        headerName: t('tech.stress.colDuration'),
        width: 105,
        type: 'number',
        // Computed at read time from started_at / ended_at (or the clock, for a
        // live run) — no stored value to order or match on.
        sortable: false,
        filterable: false,
        valueGetter: (row) => formatSeconds(row.duration_seconds),
      },
      {
        field: 'summary',
        headerName: t('tech.stress.colRequests'),
        width: 115,
        type: 'number',
        valueGetter: (row) => (row.summary ? formatCount(row.summary.requests) : '—'),
      },
      {
        field: 'peaks',
        headerName: t('tech.stress.colPeakRps'),
        width: 110,
        type: 'number',
        valueGetter: (row) => formatRps(row.peaks.rps),
      },
      {
        field: 'p95',
        headerName: t('tech.stress.colP95'),
        width: 100,
        type: 'number',
        valueGetter: (row) => formatMs(row.summary?.p95_ms ?? row.peaks.p95_ms),
      },
      {
        field: 'error_rate',
        headerName: t('tech.stress.colErrors'),
        width: 100,
        type: 'number',
        valueGetter: (row) => formatPct(row.summary?.error_rate_pct ?? row.peaks.error_rate_pct),
      },
      {
        field: 'host_cpu',
        headerName: t('tech.stress.colPeakCpu'),
        width: 110,
        type: 'number',
        valueGetter: (row) => formatPct(row.peaks.host_cpu_pct),
      },
      { field: 'triggered_by', headerName: t('tech.stress.colTriggeredBy'), minWidth: 190, type: 'text', valueGetter: (row) => row.triggered_by || '—' },
      {
        field: 'stop_reason',
        headerName: t('tech.stress.colStopReason'),
        minWidth: 220,
        type: 'text',
        valueGetter: (row) => row.stop_reason || row.error_message || '—',
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        width: 100,
        type: 'actions',
        cellRenderer: makeRenderActions({ openRun: t('tech.stress.openWorkflow'), delete: t('shell.common.delete') }, onDelete),
        valueGetter: (row) => row.workflow_run_url,
      },
    ],
    [t, onDelete]
  );

  return (
    <DuncitTable<StressRun>
      tableId="tech-stress-runs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.stress.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('tech.stress.searchPlaceholder')}
      refetchRef={refetchRef}
      onRowClick={onRowClick}
    />
  );
}
