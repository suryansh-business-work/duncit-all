import { Chip, CircularProgress, Tooltip } from '@mui/material';

type ChipColor = 'success' | 'error' | 'info' | 'warning' | 'default';

/**
 * The colour every status on the unit and regression pages wears. Keyed by
 * the server's own enum values, which never collide in meaning: PASSED is
 * green wherever it appears.
 */
const STATUS_COLOR: Record<string, ChipColor> = {
  PASSED: 'success',
  CLEAN: 'success',
  FIXED: 'success',
  FAILED: 'error',
  ERROR: 'error',
  REGRESSED: 'error',
  NEW_FAILING: 'error',
  STILL_FAILING: 'warning',
  CANCELLED: 'warning',
  RUNNING: 'info',
  REUSED: 'info',
  NEW_TESTS: 'info',
};

const LIVE = new Set(['RUNNING', 'QUEUED']);

interface Props {
  status: string;
  label: string;
  /** Shown on hover — the reason behind a red or cancelled status. */
  tooltip?: string;
}

/** A status as a chip; a live run spins. */
export default function StatusChip({ status, label, tooltip }: Readonly<Props>) {
  const live = LIVE.has(status);
  const chip = (
    <Chip
      size="small"
      variant={live ? 'outlined' : 'filled'}
      color={STATUS_COLOR[status] ?? 'default'}
      icon={live ? <CircularProgress size={12} thickness={6} color="inherit" aria-hidden /> : undefined}
      label={label}
    />
  );
  if (!tooltip) return chip;
  return <Tooltip title={tooltip}>{chip}</Tooltip>;
}

/**
 * A table cell renderer for a status column, built OUTSIDE the table
 * component so the grid never sees a new component type per render.
 */
export function makeStatusCell<T>(
  labels: Readonly<Record<string, string>>,
  statusOf: (row: T) => string,
  tooltipOf?: (row: T) => string
) {
  const renderStatus = (row: T) => {
    const status = statusOf(row);
    return <StatusChip status={status} label={labels[status] ?? status} tooltip={tooltipOf?.(row)} />;
  };
  return renderStatus;
}
