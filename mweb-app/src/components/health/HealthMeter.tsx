import { Box, Stack, Typography } from '@mui/material';

export type HealthBand = 'RED' | 'YELLOW' | 'GREEN';

interface Props {
  score: number;
  band: HealthBand;
  label?: string;
  size?: number;
  thickness?: number;
  onClick?: () => void;
  caption?: string | null;
}

const BAND_COLOR: Record<HealthBand, string> = {
  RED: '#e53935',
  YELLOW: '#fb8c00',
  GREEN: '#43a047',
};

// Half-circle gauge. We render it as an SVG arc rather than reusing MUI's
// CircularProgress so the colour can shift with the score band and we can
// inline a big numeric readout in the middle.
export default function HealthMeter({
  score,
  band,
  label = 'Account Health',
  size = 168,
  thickness = 14,
  onClick,
  caption,
}: Readonly<Props>) {
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const filled = (safeScore / 100) * circumference;
  const color = BAND_COLOR[band];

  return (
    <Box
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        outline: 'none',
        '&:focus-visible': { boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}` },
        '&:hover': onClick ? { transform: 'translateY(-1px)' } : undefined,
        transition: 'transform 120ms ease',
      }}
    >
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
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900, mt: 1 }}>
        {label}
      </Typography>
      {caption && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 0.25 }}>
          {caption}
        </Typography>
      )}
    </Box>
  );
}
