import { Chip, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import {
  isLive,
  isStaleRunning,
  runningMinutes,
  type E2eRunRow,
  type E2eRunStatus,
  type E2eRunTrigger,
  type E2eSuiteStatus,
} from './queries';

const STATUS_COLOR: Record<E2eRunStatus, 'success' | 'error' | 'info' | 'default'> = {
  QUEUED: 'default',
  RUNNING: 'info',
  SUCCESS: 'success',
  FAILED: 'error',
};

export const SUITE_COLOR: Record<E2eSuiteStatus, 'success' | 'error' | 'info' | 'default'> = {
  RUNNING: 'info',
  PASSED: 'success',
  FAILED: 'error',
  SKIPPED: 'default',
};

export type StatusLabels = Record<E2eRunStatus, string> & {
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

export const makeTriggerOptions = (labels: Record<E2eRunTrigger, string>) => [
  { value: 'SCHEDULE', label: labels.SCHEDULE },
  { value: 'PORTAL', label: labels.PORTAL },
  { value: 'MANUAL', label: labels.MANUAL },
];

export const getRowId = (row: E2eRunRow) => row.id;

/**
 * The live run's own cell: a spinner while the workflow goes, and how long it
 * has been going, so the table answers "is it nearly done?" without anybody
 * opening GitHub.
 */
function LiveChip({ row, labels }: Readonly<{ row: E2eRunRow; labels: StatusLabels }>) {
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
}

export const makeRenderStatus = (labels: StatusLabels) => {
  const renderStatus = (row: E2eRunRow) => {
    if (isLive(row)) return <LiveChip row={row} labels={labels} />;
    return (
      <Tooltip title={row.status === 'FAILED' ? row.error_message : ''}>
        <Chip size="small" label={labels[row.status]} color={STATUS_COLOR[row.status]} />
      </Tooltip>
    );
  };
  return renderStatus;
};

export const makeRenderTriggeredBy = (labels: Record<E2eRunTrigger, string>) => {
  const renderTriggeredBy = (row: E2eRunRow) => (
    <Stack spacing={0} sx={{ py: 0.5 }}>
      <Typography variant="body2" sx={{ lineHeight: 1.2 }}>
        {row.triggered_by || '—'}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {labels[row.trigger_source]}
      </Typography>
    </Stack>
  );
  return renderTriggeredBy;
};

/**
 * Which suites this run has an answer for, at a glance. Failures come first —
 * a run with one red leg out of twenty is a red run, and the point of the
 * column is to find that leg without opening anything.
 */
export function renderSuites(row: E2eRunRow) {
  const failed = row.results.filter((r) => r.status === 'FAILED');
  if (failed.length === 0) return <Typography variant="body2">{row.totals.suites_passed}</Typography>;
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
      {failed.slice(0, 3).map((result) => (
        <Chip key={result.key} size="small" color="error" variant="outlined" label={result.key} />
      ))}
      {failed.length > 3 && <Chip size="small" color="error" label={`+${failed.length - 3}`} />}
    </Stack>
  );
}

/** The signup address this run used, which is how you find the account later. */
export function renderIdentity(row: E2eRunRow) {
  if (!row.signup_email) return <Typography variant="body2">—</Typography>;
  return (
    <Tooltip title={row.signup_email}>
      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }} noWrap>
        {row.signup_email}
      </Typography>
    </Tooltip>
  );
}

/**
 * Whether Slack heard about this run. A posted result and an unposted one look
 * identical on the row otherwise, and "nobody was told" is exactly the thing
 * worth noticing about a red sweep.
 */
export const makeRenderSlack = (posted: string, skipped: string) => {
  const renderSlack = (row: E2eRunRow) => {
    if (row.slack_ts) {
      return <Chip size="small" variant="outlined" color="success" label={posted} />;
    }
    return (
      <Tooltip title={row.slack_error ?? ''}>
        <Chip size="small" variant="outlined" label={skipped} />
      </Tooltip>
    );
  };
  return renderSlack;
};

export interface LinkLabels {
  run: string;
  runPending: string;
  delete: string;
}

export const makeRenderLinks = (labels: LinkLabels, onDelete: (row: E2eRunRow) => void) => {
  const renderLinks = (row: E2eRunRow) => (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      {row.workflow_run_url ? (
        <Tooltip title={labels.run}>
          <DuncitIconButton
            size="small"
            aria-label={labels.run}
            href={row.workflow_run_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            <OpenInNewIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      ) : (
        <Tooltip title={labels.runPending}>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            —
          </Typography>
        </Tooltip>
      )}
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
    </Stack>
  );
  return renderLinks;
};
