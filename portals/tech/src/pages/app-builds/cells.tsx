import { Box, Chip, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import {
  isLive,
  isStaleRunning,
  runningMinutes,
  type AppBuildArtifact,
  type AppBuildRow,
  type AppBuildStatus,
} from './queries';

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

export const renderBuild = (row: AppBuildRow) => (
  <Box>
    <Typography variant="body2" noWrap title={row.build_name || row.build_no}>
      {row.build_name || '—'}
    </Typography>
    <Typography variant="caption" sx={{
      color: "text.secondary"
    }}>
      {row.build_no}
    </Typography>
  </Box>
);

export const renderCommit = (row: AppBuildRow) => {
  const subject = row.commits[0]?.subject ?? '';
  return (
    <Box>
      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
        {row.commit_sha ? row.commit_sha.slice(0, 7) : '—'}
      </Typography>
      {subject && (
        <Typography variant="caption" noWrap title={subject} sx={{
          color: "text.secondary"
        }}>
          {subject}
        </Typography>
      )}
    </Box>
  );
};

/**
 * Which stack the built app talks to. Staging is called out in colour because
 * it is baked in at compile time — an installed build cannot be pointed
 * somewhere else, so handing a tester the wrong one wastes the whole build.
 */
export const makeRenderEnv = (labels: Record<string, string>) => {
  const renderEnv = (row: AppBuildRow) => (
    <Chip
      size="small"
      variant="outlined"
      color={row.app_env === 'STAGING' ? 'warning' : 'default'}
      label={labels[row.app_env] ?? row.app_env}
    />
  );
  return renderEnv;
};

/** Who started it, and whether they pressed a button or merged something. */
export const makeRenderTriggeredBy = (labels: Record<string, string>) => {
  const renderTriggeredBy = (row: AppBuildRow) => (
    <Box>
      <Typography variant="body2" noWrap title={row.triggered_by}>
        {row.triggered_by || '—'}
      </Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {labels[row.trigger_source] ?? row.trigger_source}
      </Typography>
    </Box>
  );
  return renderTriggeredBy;
};

/** Slack outcome: posted / skipped-with-reason. The row is the record either way. */
export const makeRenderSlack = (postedLabel: string, skippedLabel: string) => {
  const renderSlack = (row: AppBuildRow) => {
    if (row.slack_ts) {
      return <Chip size="small" color="success" variant="outlined" label={postedLabel} />;
    }
    return (
      <Tooltip title={row.slack_error ?? ''}>
        <Chip size="small" variant="outlined" label={skippedLabel} />
      </Tooltip>
    );
  };
  return renderSlack;
};

export interface LinkLabels {
  /** Takes the artifact kind, e.g. "Download APK". */
  download: (kind: string) => string;
  run: string;
  delete: string;
  /** Shown in place of a download icon when an artifact never stored. */
  noArtifact: string;
}

/**
 * One icon per file the build produced — an Android build offers its APK and
 * its AAB from the same row. An artifact that never stored shows WHY rather
 * than an empty gap, because a missing download is the thing somebody has to
 * act on and it cannot look the same as a build that simply failed.
 */
const ArtifactLink = ({
  artifact,
  labels,
}: Readonly<{ artifact: AppBuildArtifact; labels: LinkLabels }>) => {
  if (!artifact.url) {
    return (
      <Tooltip title={artifact.error || labels.noArtifact}>
        <ErrorOutlineIcon fontSize="small" color="warning" />
      </Tooltip>
    );
  }
  const label = labels.download(artifact.kind);
  return (
    <Tooltip title={label}>
      <IconButton size="small" component="a" href={artifact.url} aria-label={label}>
        <DownloadIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

/** Icon links stop propagation so opening them never also opens the details dialog. */
export const makeRenderLinks = (labels: LinkLabels, onDelete: (row: AppBuildRow) => void) => {
  const renderLinks = (row: AppBuildRow) => (
    <Box onClick={(e) => e.stopPropagation()}>
      {row.artifacts.map((a) => (
        <ArtifactLink key={a.kind} artifact={a} labels={labels} />
      ))}
      {row.workflow_run_url && (
        <Tooltip title={labels.run}>
          <IconButton
            size="small"
            component="a"
            href={row.workflow_run_url}
            target="_blank"
            rel="noreferrer"
            aria-label={labels.run}
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title={labels.delete}>
        <IconButton size="small" onClick={() => onDelete(row)} aria-label={labels.delete}>
          <DeleteOutlineIcon fontSize="small" color="error" />
        </IconButton>
      </Tooltip>
    </Box>
  );
  return renderLinks;
};
