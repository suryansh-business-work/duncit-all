import { Box, Stack, Tooltip, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import type { AnalyticsMailSubscription } from './queries';

/**
 * The subscribers table's cells, hoisted out of the table so each renderer is
 * a module-scope component (S6478) built from the labels the table passes in.
 */

export interface RowActions {
  onSend: (row: AnalyticsMailSubscription) => void;
  onEdit: (row: AnalyticsMailSubscription) => void;
  onDelete: (row: AnalyticsMailSubscription) => void;
  /** The row whose report is being sent right now, so its button can wait. */
  sendingId: string | null;
}

export interface ActionLabels {
  send: string;
  edit: string;
  remove: string;
}

const LAST_STATUS_COLORS: StatusColorMap = { SENT: 'success', FAILED: 'error', SKIPPED: 'warning' };

export const makeRenderName = () =>
  function RenderName(row: AnalyticsMailSubscription) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {row.name}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
          {row.email}
        </Typography>
      </Box>
    );
  };

export const makeRenderState = (labels: { active: string; paused: string }) =>
  function RenderState(row: AnalyticsMailSubscription) {
    return row.is_active ? (
      <StatusChip status="ACTIVE" colorMap={{ ACTIVE: 'success' }} label={labels.active} size="small" />
    ) : (
      <StatusChip status="PAUSED" colorMap={{ PAUSED: 'default' }} label={labels.paused} size="small" />
    );
  };

export const makeRenderLastSent = (labels: Record<string, string>, formatWhen: (iso: string) => string, never: string) =>
  function RenderLastSent(row: AnalyticsMailSubscription) {
    if (!row.last_sent_at || !row.last_status) return <Typography variant="body2">{never}</Typography>;
    const chip = (
      <StatusChip
        status={row.last_status}
        colorMap={LAST_STATUS_COLORS}
        label={labels[row.last_status] ?? row.last_status}
        size="small"
      />
    );
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        {row.last_error ? <Tooltip title={row.last_error}>{chip}</Tooltip> : chip}
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
          {formatWhen(row.last_sent_at)}
        </Typography>
      </Stack>
    );
  };

export const makeRenderActions = (labels: ActionLabels, actions: RowActions) =>
  function RenderActions(row: AnalyticsMailSubscription) {
    const sending = actions.sendingId === row.id;
    return (
      <Box sx={{ display: 'flex', gap: 0.25 }}>
        <Tooltip title={labels.send}>
          <span>
            <DuncitIconButton
              size="small"
              aria-label={labels.send}
              disabled={sending}
              onClick={() => actions.onSend(row)}
              data-testid={`analytics-mail-send-${row.id}`}
            >
              <SendIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
        <Tooltip title={labels.edit}>
          <DuncitIconButton size="small" aria-label={labels.edit} onClick={() => actions.onEdit(row)}>
            <EditIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <Tooltip title={labels.remove}>
          <DuncitIconButton size="small" color="error" aria-label={labels.remove} onClick={() => actions.onDelete(row)}>
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      </Box>
    );
  };
