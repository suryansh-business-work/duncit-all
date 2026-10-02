import { Chip, CircularProgress, Tooltip } from '@mui/material';
import {
  isLive,
  isStaleRunning,
  runningMinutes,
  type AppBuildRow,
  type AppBuildStatus,
} from '../queries';

const STATUS_COLOR: Record<string, 'success' | 'error' | 'info' | 'default'> = {
  QUEUED: 'default',
  RUNNING: 'info',
  SUCCESS: 'success',
  FAILED: 'error',
};

export type StatusLabels = Record<AppBuildStatus, string> & {
  /** A live row too old to still be live — the runner died, or never started. */
  stale: string;
  /** Takes the whole minutes elapsed, e.g. "Running for 6 min". */
  elapsed: (minutes: string) => string;
};

export const makeStatusOptions = (labels: StatusLabels) => [
  { value: 'QUEUED', label: labels.QUEUED },
  { value: 'RUNNING', label: labels.RUNNING },
  { value: 'SUCCESS', label: labels.SUCCESS },
  { value: 'FAILED', label: labels.FAILED },
];

export const makeEnvOptions = (labels: Record<string, string>) => [
  { value: 'PRODUCTION', label: labels.PRODUCTION ?? 'PRODUCTION' },
  { value: 'STAGING', label: labels.STAGING ?? 'STAGING' },
];

export const getRowId = (row: AppBuildRow) => row.id;

/**
 * The live build's own cell: a spinner while the workflow runs, and how long it
 * has been going, so the table answers "is it nearly done?" without anybody
 * opening GitHub.
 */
const LiveChip = ({ row, labels }: Readonly<{ row: AppBuildRow; labels: StatusLabels }>) => {
  if (isStaleRunning(row)) {
    return (
      <Tooltip title={labels.stale}>
        <Chip size="small" variant="outlined" color="warning" label={labels[row.status]} />
      </Tooltip>
    );
  }
  const elapsed = labels.elapsed(String(runningMinutes(row)));
  return (
    <Tooltip title={row.stage ? `${row.stage} — ${elapsed}` : elapsed}>
      <Chip
        size="small"
        color="info"
        variant="outlined"
        icon={<CircularProgress size={12} thickness={6} color="inherit" />}
        label={labels[row.status]}
      />
    </Tooltip>
  );
};

export const makeRenderStatus = (labels: StatusLabels) => {
  const renderStatus = (row: AppBuildRow) => {
    if (isLive(row)) return <LiveChip row={row} labels={labels} />;
    return (
      <Tooltip title={row.status === 'FAILED' ? row.error_message : ''}>
        <Chip size="small" label={labels[row.status]} color={STATUS_COLOR[row.status] ?? 'error'} />
      </Tooltip>
    );
  };
  return renderStatus;
};
