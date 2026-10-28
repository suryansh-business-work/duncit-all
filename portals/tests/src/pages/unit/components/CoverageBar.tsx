import { Box, LinearProgress, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatPct } from '../format';

interface Props {
  pct: number | null | undefined;
  /** What the bar measures, for a screen reader — e.g. "Lines, admin". */
  label: string;
}

/** One coverage percentage as a bar with its number beside it. Nothing measured reads as a dash, not 0%. */
export default function CoverageBar({ pct, label }: Readonly<Props>) {
  const { t } = useTranslation();
  const measured = pct != null && Number.isFinite(pct);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 1, minWidth: 0 }}>
      <LinearProgress
        variant="determinate"
        value={measured ? Math.min(Math.max(pct, 0), 100) : 0}
        aria-label={label}
        aria-valuetext={formatPct(t, pct)}
        sx={{ flex: 1, minWidth: 0 }}
      />
      <Typography variant="body2" sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        {formatPct(t, pct)}
      </Typography>
    </Box>
  );
}
