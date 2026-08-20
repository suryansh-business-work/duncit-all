import { Chip, IconButton, Tooltip } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { STAGE_COLOR, STAGE_LABEL_KEY } from './helpers';
import type { AutoPodTableRow } from './queries';

interface StageChipProps {
  row: AutoPodTableRow;
  t: (key: string) => string;
}

/** Where the offer sits in its enrolment cycle, in one chip. */
export function AutoPodStageChip({ row, t }: Readonly<StageChipProps>) {
  return <Chip size="small" color={STAGE_COLOR[row.stage]} label={t(STAGE_LABEL_KEY[row.stage])} />;
}

interface ViewPodButtonProps {
  row: AutoPodTableRow;
  label: string;
  onView: (row: AutoPodTableRow) => void;
}

/**
 * Only appears once the offer materialized: before that there is no pod to open,
 * and a dead button beside two live ones reads as a bug.
 */
export function ViewPodButton({ row, label, onView }: Readonly<ViewPodButtonProps>) {
  if (!row.pod_id) return null;
  return (
    <Tooltip title={label}>
      <IconButton size="small" color="primary" aria-label={label} onClick={() => onView(row)}>
        <OpenInNewIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
