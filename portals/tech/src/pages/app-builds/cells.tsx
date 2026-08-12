import { Box, Chip, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
  isStaleRunning,
  runningMinutes,
  type AppBuildArtifact,
  type AppBuildRow,
  type AppBuildStatus,
} from './queries';

const STATUS_COLOR: Record<string, 'success' | 'error' | 'info'> = {
  RUNNING: 'info',
  SUCCESS: 'success',
  FAILED: 'error',
};

export type StatusLabels = Record<AppBuildStatus, string> & {
  /** A RUNNING row too old to still be running — the runner died mid-job. */
  stale: string;
  /** Takes the whole minutes elapsed, e.g. "Running for 6 min". */
  elapsed: (minutes: string) => string;
};

export const makeStatusOptions = (labels: StatusLabels) => [
  { value: 'RUNNING', label: labels.RUNNING },
  { value: 'SUCCESS', label: labels.SUCCESS },
  { value: 'FAILED', label: labels.FAILED },
];

export const getRowId = (row: AppBuildRow) => row.id;

/**
 * The live build's own cell: a spinner while the workflow runs, and how long it
 * has been going, so the table answers "is it nearly done?" without anybody
 * opening GitHub.
 */
const RunningChip = ({ row, labels }: Readonly<{ row: AppBuildRow; labels: StatusLabels }>) => {
  if (isStaleRunning(row)) {
    return (
      <Tooltip title={labels.stale}>
        <Chip size="small" variant="outlined" color="warning" label={labels.RUNNING} />
      </Tooltip>
    );
  }
  return (
    <Tooltip title={labels.elapsed(String(runningMinutes(row)))}>
      <Chip
        size="small"
        color="info"
        variant="outlined"
        icon={<CircularProgress size={12} thickness={6} color="inherit" />}
        label={labels.RUNNING}
      />
    </Tooltip>
  );
};

export const makeRenderStatus = (labels: StatusLabels) => {
  const renderStatus = (row: AppBuildRow) => {
    if (row.status === 'RUNNING') return <RunningChip row={row} labels={labels} />;
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
    <Typography variant="caption" color="text.secondary">
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
        <Typography variant="caption" color="text.secondary" noWrap title={subject}>
          {subject}
        </Typography>
      )}
    </Box>
  );
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
