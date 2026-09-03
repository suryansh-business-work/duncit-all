import { Typography } from '@mui/material';

/**
 * One `value label` fact in a row's facts strip — "12 Pods", "340 Followers".
 * The studio's club rows and the dashboard's per-club breakdown read the same.
 */
export default function FactLine({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
      <b>{value}</b> {label}
    </Typography>
  );
}
