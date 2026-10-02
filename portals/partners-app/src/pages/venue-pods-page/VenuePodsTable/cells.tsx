import { Stack, Tooltip, Typography } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { DuncitButton } from '@duncit/buttons';
import type { DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { BUCKET_COLORS, BUCKET_LABELS, cancelDisabledText, type VenuePodRow } from '../queries';
import type { useTranslation } from '@duncit/shell';

const CANCEL_HINT = 'Cancel this pod and refund every paid attendee';

export const BUCKET_OPTIONS = Object.entries(BUCKET_LABELS).map(([value, label]) => ({ value, label }));

export const getRowId = (row: VenuePodRow) => row.id;

export const renderPod = (row: VenuePodRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" sx={{
      fontWeight: 700
    }}>
      {row.pod_title}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
      {row.host_names.join(', ') || '—'}
    </Typography>
  </Stack>
);

export const renderBucket = (row: VenuePodRow) => (
  <StatusChip status={row.bucket} label={BUCKET_LABELS[row.bucket]} colorMap={BUCKET_COLORS} />
);

/** Per-row Cancel action; the span keeps the tooltip alive while disabled. */
function CancelPodCell({
  row,
  onCancel,
}: Readonly<{ row: VenuePodRow; onCancel: (row: VenuePodRow) => void }>) {
  const disabledReason = cancelDisabledText(row);
  return (
    <Tooltip title={disabledReason ?? CANCEL_HINT}>
      <span>
        <DuncitButton
          size="small"
          variant="outlined"
          color="error"
          disabled={!!disabledReason}
          startIcon={<EventBusyIcon fontSize="small" />}
          onClick={(event) => {
            event.stopPropagation();
            onCancel(row);
          }}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Cancel pod
        </DuncitButton>
      </span>
    </Tooltip>
  );
}

/**
 * Built at module scope so the cell renderer is never a component defined inside
 * a component. Renderer-only columns freeze on the pre-mutation row after a
 * refetch, so the `valueGetter` keys the cell on the button's own state — and
 * because AG Grid exports the value, not the renderer, it reads as plain
 * English in a CSV instead of a machine key.
 */
type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * "Request Change Venue" — the non-destructive answer beside Cancel.
 *
 * Deliberately FIRST in the cell: cancelling refunds every attendee and ends
 * the pod, and asking Duncit for a different venue keeps both. A venue owner
 * reaching for the destructive one should have passed this on the way.
 */
function RequestChangeCell({
  row,
  onRequestChange,
  label,
}: Readonly<{ row: VenuePodRow; onRequestChange: (row: VenuePodRow) => void; label: string }>) {
  return (
    <DuncitButton
      size="small"
      variant="text"
      color="warning"
      startIcon={<SwapHorizIcon fontSize="small" />}
      onClick={(event) => {
        event.stopPropagation();
        onRequestChange(row);
      }}
      sx={{ whiteSpace: 'nowrap' }}
    >
      {label}
    </DuncitButton>
  );
}

export const actionsColumn = (
  onCancel: (row: VenuePodRow) => void,
  onRequestChange: (row: VenuePodRow) => void,
  requestChangeLabel: string,
  t: Translate,
): DuncitColumn<VenuePodRow> => ({
  field: 'actions',
  headerName: t('shell.common.actions'),
  width: 300,
  type: 'actions',
  valueGetter: (row) => cancelDisabledText(row) ?? CANCEL_HINT,
  cellRenderer: (row: VenuePodRow) => (
    <Stack component="span" direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <RequestChangeCell row={row} onRequestChange={onRequestChange} label={requestChangeLabel} />
      <CancelPodCell row={row} onCancel={onCancel} />
    </Stack>
  ),
});
