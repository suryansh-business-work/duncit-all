import { Chip } from '@mui/material';

interface Props {
  on: boolean;
  onLabel: string;
  offLabel: string;
  /** Chip color while `on`. Default success. */
  onColor?: 'success' | 'primary' | 'warning' | 'error' | 'info';
}

/** A boolean cell: a filled chip when the flag is on, an outlined one when it is off. */
export function FlagChip({ on, onLabel, offLabel, onColor = 'success' }: Readonly<Props>) {
  if (on) return <Chip size="small" color={onColor} label={onLabel} />;
  return <Chip size="small" variant="outlined" label={offLabel} />;
}
