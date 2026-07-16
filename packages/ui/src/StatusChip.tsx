import { Chip, type ChipProps } from '@mui/material';

export type StatusChipColor = 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

export type StatusColorMap = Readonly<Record<string, StatusChipColor>>;

/**
 * The repo-wide default for the common approval vocabulary. NOTE: several
 * portals historically drifted from this map (e.g. SUBMITTED=warning in
 * onboarding cards and products brandStatus, DRAFT=default in products).
 * When migrating those sites pass a full `colorMap` that preserves their
 * current colors — do NOT silently adopt the defaults.
 */
export const STATUS_CHIP_COLORS: StatusColorMap = {
  APPROVED: 'success',
  REJECTED: 'error',
  DENIED: 'error',
  PENDING: 'warning',
  DRAFT: 'warning',
  SUBMITTED: 'info',
};

export interface StatusChipProps extends Omit<ChipProps, 'color' | 'label'> {
  status: string;
  /**
   * Full replacement for STATUS_CHIP_COLORS (NOT merged) so domain vocabularies
   * (refund, meeting, campaign, lead stage…) stay exactly as authored. To tweak
   * one entry, spread the default: `{{ ...STATUS_CHIP_COLORS, SUBMITTED: 'warning' }}`.
   */
  colorMap?: StatusColorMap;
  /** Color when `status` is not in the map. Default 'default'. */
  fallbackColor?: StatusChipColor;
  /** Display label; defaults to the raw status string. */
  label?: ChipProps['label'];
}

/** `<Chip size="small">` whose color resolves from a status → color map. */
export function StatusChip({ status, colorMap, fallbackColor = 'default', label, ...chipProps }: Readonly<StatusChipProps>) {
  const map = colorMap ?? STATUS_CHIP_COLORS;
  const color = map[status] ?? fallbackColor;
  return <Chip size="small" label={label ?? status} color={color} {...chipProps} />;
}
