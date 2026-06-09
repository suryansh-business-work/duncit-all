import { Box, Stack, Typography } from '@mui/material';

export type HealthBand = 'RED' | 'YELLOW' | 'GREEN';

interface Props {
  score: number;
  band: HealthBand;
  size?: number;
  thickness?: number;
}

const BAND_COLOR: Record<HealthBand, string> = {
  RED: '#e53935',
  YELLOW: '#fb8c00',
  GREEN: '#43a047',
};

export default function HealthMeter({ score, band, size = 120, thickness = 12 }: Readonly<Props>) {
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const filled = (safeScore / 100) * circumference;
  const color = BAND_COLOR[band];

  return (
    <Box sx={{ position: 'relative', width: size, height: size / 2 + thickness, overflow: 'hidden' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(180deg)' }}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={thickness}
          strokeDasharray={`${circumference} ${circumference * 2}`}
          strokeLinecap="round"
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={`${filled} ${circumference * 2}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 420ms ease' }}
        />
      </svg>
      <Stack
        alignItems="center"
        sx={{
          position: 'absolute',
          inset: 0,
          justifyContent: 'flex-end',
          pb: 0.5,
          pointerEvents: 'none',
        }}
      >
        <Typography sx={{ fontWeight: 950, fontSize: size * 0.28, lineHeight: 1, color }}>
          {safeScore}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
          / 100
        </Typography>
      </Stack>
    </Box>
  );
}
