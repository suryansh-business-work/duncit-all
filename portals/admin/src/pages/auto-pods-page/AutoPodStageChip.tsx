import { Chip, IconButton, Tooltip } from '@mui/material';
import CancelScheduleSendIcon from '@mui/icons-material/CancelScheduleSend';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { isAutoPodCancellable, STAGE_COLOR, STAGE_LABEL_KEY } from './helpers';
import type { AutoPodTableRow } from './queries';

interface StageChipProps {
  row: AutoPodTableRow;
  t: (key: string) => string;
}

/** Where the offer sits in its enrolment cycle, in one chip. */
export function AutoPodStageChip({ row, t }: Readonly<StageChipProps>) {
  return <Chip size="small" color={STAGE_COLOR[row.stage]} label={t(STAGE_LABEL_KEY[row.stage])} />;
}

interface RowButtonProps {
  row: AutoPodTableRow;
  label: string;
  onClick: (row: AutoPodTableRow) => void;
}

/**
 * Only appears once the offer materialized: before that there is no pod to open,
 * and a dead button beside two live ones reads as a bug.
 */
export function ViewPodButton({ row, label, onClick }: Readonly<RowButtonProps>) {
  if (!row.pod_id) return null;
  return (
    <Tooltip title={label}>
      <IconButton size="small" color="primary" aria-label={label} onClick={() => onClick(row)}>
        <OpenInNewIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

/**
 * Cancel sits beside Delete rather than replacing it: cancelling keeps the
 * record (and its reason) for the books, deleting removes it for good. The span
 * keeps the tooltip alive while the button is disabled.
 */
export function CancelAutoPodButton({ row, label, onClick }: Readonly<RowButtonProps>) {
  const disabled = !isAutoPodCancellable(row);
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          color="warning"
          aria-label={label}
          disabled={disabled}
          onClick={() => onClick(row)}
        >
          <CancelScheduleSendIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
}
