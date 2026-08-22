import { Box, Chip, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RestoreIcon from '@mui/icons-material/Restore';
import { formatBytes } from '../../server/format';
import { compressionLabel, type BackupRow, type BackupStatus } from './queries';

const STATUS_COLOR: Record<BackupStatus, 'success' | 'error' | 'info'> = {
  RUNNING: 'info',
  SUCCEEDED: 'success',
  FAILED: 'error',
};

export type StatusLabels = Record<BackupStatus, string>;
export type TriggerLabels = Record<'SCHEDULED' | 'MANUAL', string>;

export interface ActionLabels {
  download: string;
  restore: string;
  delete: string;
  noFile: string;
}

export const makeStatusOptions = (labels: StatusLabels) => [
  { value: 'RUNNING', label: labels.RUNNING },
  { value: 'SUCCEEDED', label: labels.SUCCEEDED },
  { value: 'FAILED', label: labels.FAILED },
];

export const makeTriggerOptions = (labels: TriggerLabels) => [
  { value: 'SCHEDULED', label: labels.SCHEDULED },
  { value: 'MANUAL', label: labels.MANUAL },
];

/**
 * Status, with the failure reason on the chip rather than a row nobody opens.
 * A backup that failed is the one row on this page that must explain itself.
 */
export const makeRenderStatus = (labels: StatusLabels) =>
  function RenderStatus(row: BackupRow) {
    if (row.status === 'RUNNING') {
      const label = row.currentCollection ?? labels.RUNNING;
      return (
        <Tooltip title={label}>
          <Chip
            size="small"
            color="info"
            variant="outlined"
            icon={<CircularProgress size={12} thickness={6} />}
            label={labels.RUNNING}
          />
        </Tooltip>
      );
    }
    const chip = (
      <Chip size="small" color={STATUS_COLOR[row.status]} label={labels[row.status]} />
    );
    if (row.status === 'FAILED' && row.error) {
      return (
        <Tooltip title={row.error}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            {chip}
            <ErrorOutlineIcon fontSize="small" color="error" />
          </Box>
        </Tooltip>
      );
    }
    return chip;
  };

export const makeRenderTrigger = (labels: TriggerLabels) =>
  function RenderTrigger(row: BackupRow) {
    return (
      <Chip
        size="small"
        variant="outlined"
        color={row.trigger === 'SCHEDULED' ? 'default' : 'primary'}
        label={labels[row.trigger]}
      />
    );
  };

/** Compressed size, with the uncompressed total and the ratio underneath. */
export function renderSize(row: BackupRow) {
  if (!row.sizeBytes) return <Typography variant="body2">—</Typography>;
  return (
    <Box sx={{ lineHeight: 1.3, py: 0.5 }}>
      <Typography variant="body2">{formatBytes(row.sizeBytes)}</Typography>
      <Typography variant="caption" color="text.secondary">
        {formatBytes(row.rawBytes)} · {compressionLabel(row)}
      </Typography>
    </Box>
  );
}

export interface RowActions {
  onDownload: (row: BackupRow) => void;
  onRestore: (row: BackupRow) => void;
  onDelete: (row: BackupRow) => void;
}

/**
 * Download / restore / delete.
 *
 * All three are disabled the moment the archive is gone — a pruned or deleted
 * row keeps its history and loses its file, and offering a restore from a file
 * that is not there would only fail at the worst possible moment.
 */
export const makeRenderActions = (labels: ActionLabels, actions: RowActions) =>
  function RenderActions(row: BackupRow) {
    if (!row.hasFile) {
      return (
        <Typography variant="caption" color="text.secondary">
          {labels.noFile}
        </Typography>
      );
    }
    return (
      <Box sx={{ display: 'flex', gap: 0.25 }}>
        <Tooltip title={labels.download}>
          <IconButton size="small" onClick={() => actions.onDownload(row)}>
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={labels.restore}>
          <IconButton size="small" color="warning" onClick={() => actions.onRestore(row)}>
            <RestoreIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={labels.delete}>
          <IconButton size="small" color="error" onClick={() => actions.onDelete(row)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };
