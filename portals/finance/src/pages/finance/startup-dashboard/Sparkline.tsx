import { Box, useTheme } from '@mui/material';
import type { MetricPoint } from './types';

interface Props {
  points: readonly MetricPoint[];
  color?: string;
  height?: number;
}

/** Dependency-free SVG sparkline for a metric's monthly series. */
export default function Sparkline({ points, color, height = 36 }: Readonly<Props>) {
  const theme = useTheme();
  const stroke = color ?? theme.palette.primary.main;
  const width = 120;

  if (points.length < 2) return <Box sx={{ height }} />;

  const values = points.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p.value - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <Box sx={{ height }} aria-hidden>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Box>
  );
}
