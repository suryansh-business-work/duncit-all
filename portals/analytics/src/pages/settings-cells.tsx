import type { ReactNode } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { StatusChip, type StatusColorMap } from '@duncit/ui';

/**
 * The cells the Settings tables (Analytics Mails, Alerts) share, as
 * module-scope renderer factories (S6478) built from the labels a table passes in.
 */

/** A bold first line and a quiet second one: a subscriber and their address, an alert and its tile. */
export const makeRenderTwoLine = <T,>(titleOf: (row: T) => string, captionOf: (row: T) => string) =>
  function RenderTwoLine(row: T) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {titleOf(row)}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
          {captionOf(row)}
        </Typography>
      </Box>
    );
  };

export const makeRenderActive = <T extends { is_active: boolean }>(labels: { active: string; paused: string }) =>
  function RenderActive(row: T) {
    return row.is_active ? (
      <StatusChip status="ACTIVE" colorMap={{ ACTIVE: 'success' }} label={labels.active} size="small" />
    ) : (
      <StatusChip status="PAUSED" colorMap={{ PAUSED: 'default' }} label={labels.paused} size="small" />
    );
  };

export interface LastRun {
  status: string | null | undefined;
  at: string | null | undefined;
  /** Shown on hover over the status, when the run has something to explain. */
  detail?: string | null;
}

interface LastRunLabels {
  status: Record<string, string>;
  colors: StatusColorMap;
  never: string;
  formatWhen: (iso: string) => string;
}

/** How the last run went and when: a status chip (its reason on hover) and the time. */
export const makeRenderLastRun = <T,>(runOf: (row: T) => LastRun, labels: LastRunLabels) =>
  function RenderLastRun(row: T) {
    const run = runOf(row);
    if (!run.at || !run.status) return <Typography variant="body2">{labels.never}</Typography>;
    const chip = (
      <StatusChip status={run.status} colorMap={labels.colors} label={labels.status[run.status] ?? run.status} size="small" />
    );
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        {run.detail ? <Tooltip title={run.detail}>{chip}</Tooltip> : chip}
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
          {labels.formatWhen(run.at)}
        </Typography>
      </Stack>
    );
  };

export interface RowButtons<T> {
  onRun: (row: T) => void;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  /** The row whose run is under way, so its button can wait. */
  runningId: string | null;
}

interface RowButtonLabels {
  run: string;
  edit: string;
  remove: string;
}

/** Run now (send, check), edit and remove — the row's own actions, each named for screen readers. */
export const makeRenderRowButtons = <T extends { id: string }>(
  labels: RowButtonLabels,
  runIcon: ReactNode,
  runTestId: string,
  buttons: RowButtons<T>
) =>
  function RenderRowButtons(row: T) {
    return (
      <Box sx={{ display: 'flex', gap: 0.25 }}>
        <Tooltip title={labels.run}>
          <span>
            <DuncitIconButton
              size="small"
              aria-label={labels.run}
              disabled={buttons.runningId === row.id}
              onClick={() => buttons.onRun(row)}
              data-testid={`${runTestId}-${row.id}`}
            >
              {runIcon}
            </DuncitIconButton>
          </span>
        </Tooltip>
        <Tooltip title={labels.edit}>
          <DuncitIconButton size="small" aria-label={labels.edit} onClick={() => buttons.onEdit(row)}>
            <EditIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <Tooltip title={labels.remove}>
          <DuncitIconButton size="small" color="error" aria-label={labels.remove} onClick={() => buttons.onDelete(row)}>
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      </Box>
    );
  };
