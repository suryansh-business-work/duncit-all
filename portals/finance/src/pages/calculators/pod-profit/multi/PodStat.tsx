import { Box, Typography } from '@mui/material';

export type StatTone = 'primary' | 'success' | 'warning' | 'default';
export type StatSize = 'sm' | 'lg';

const TONE: Record<StatTone, string> = {
  primary: 'primary.main',
  success: 'success.main',
  warning: 'warning.main',
  default: 'text.primary',
};

interface Props {
  label: string;
  value: string;
  tone: StatTone;
  size: StatSize;
}

/**
 * One labelled amount.
 *
 * The same four figures appear in every accordion header and again in the
 * totals card at the end, so they are one component read at two sizes rather
 * than two sets of nearly-identical markup (rule 34).
 */
export default function PodStat({ label, value, tone, size }: Readonly<Props>) {
  const large = size === 'lg';
  return (
    <Box sx={{ minWidth: large ? 150 : 108 }}>
      <Typography
        variant="caption"
        noWrap
        sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', lineHeight: 1.4 }}
      >
        {label}
      </Typography>
      <Typography
        variant={large ? 'h6' : 'body2'}
        noWrap
        sx={{ fontWeight: 800, color: TONE[tone] }}
      >
        {value}
      </Typography>
    </Box>
  );
}
