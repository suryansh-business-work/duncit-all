import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { downloadUrl, type AppBuildRow, type AppBuildStatus } from './queries';

const STATUS_COLOR: Record<string, 'success' | 'error'> = {
  SUCCESS: 'success',
  FAILED: 'error',
};

export type StatusLabels = Record<AppBuildStatus, string>;

export const makeStatusOptions = (labels: StatusLabels) => [
  { value: 'SUCCESS', label: labels.SUCCESS },
  { value: 'FAILED', label: labels.FAILED },
];

export const getRowId = (row: AppBuildRow) => row.id;

export const makeRenderStatus = (labels: StatusLabels) => {
  const renderStatus = (row: AppBuildRow) => (
    <Chip size="small" label={labels[row.status]} color={STATUS_COLOR[row.status] ?? 'error'} />
  );
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
  download: string;
  run: string;
  delete: string;
  /** Shown in place of the download icon when a SUCCESS build has no artifact. */
  noArtifact: string;
}

/**
 * A build that succeeded but has no artifact shows WHY, rather than an empty
 * cell — a missing download is the thing somebody has to act on, so it cannot
 * look the same as a build that simply failed.
 */
const renderMissing = (row: AppBuildRow, label: string) => (
  <Tooltip title={row.artifact_error || label}>
    <ErrorOutlineIcon fontSize="small" color="warning" />
  </Tooltip>
);

/** Icon links stop propagation so opening them never also opens the details dialog. */
export const makeRenderLinks = (labels: LinkLabels, onDelete: (row: AppBuildRow) => void) => {
  const renderLinks = (row: AppBuildRow) => (
    <Box onClick={(e) => e.stopPropagation()}>
      {row.artifact_url && (
        <Tooltip title={labels.download}>
          <IconButton
            size="small"
            component="a"
            href={downloadUrl(row)}
            aria-label={labels.download}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {!row.artifact_url && row.status === 'SUCCESS' && renderMissing(row, labels.noArtifact)}
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
