import { Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from '../../i18n/useTranslation';

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
  label,
  size = 168,
  thickness = 14,
  onClick,
  caption,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Resolved here, not as a parameter default: a default is evaluated
  // before any hook runs, so `t` would not exist yet.
  const labelText = label ?? t('mweb.health.accountHealth');
  const theme = useTheme();
  const trackColor = alpha(theme.palette.text.primary, 0.08);
  const radius = (size - thickness) / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const filled = (safeScore / 100) * circumference;
  const color = BAND_COLOR[band];
  const height = size / 2 + thickness;
  // The half circle is drawn where it is shown — left end, over the top, right
  // end — rather than drawing a full circle, rotating the <svg> 180° and
  // clipping the bottom half. Keeps this identical to the native twin, whose
  // rotation is dropped when the app renders as web.
  const arc = `M ${thickness / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - thickness / 2} ${cy}`;

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
      <Box sx={{ position: 'relative', width: size, height }}>
        <svg width={size} height={height}>
          <path
            d={arc}
            fill="none"
            stroke={trackColor}
            strokeWidth={thickness}
            strokeLinecap="round"
          />
          <path
            d={arc}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 420ms ease' }}
          />
        </svg>
        <Stack
          sx={{
            alignItems: "center",
            position: 'absolute',
            inset: 0,
            justifyContent: 'flex-end',
            pb: 0.5,
            pointerEvents: 'none'
          }}>
          <Typography sx={{ fontWeight: 700, fontSize: size * 0.28, lineHeight: 1, color }}>
            {safeScore}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600
            }}>
            / 100
          </Typography>
        </Stack>
      </Box>
      <Typography
        variant="overline"
        sx={{
          color: "text.secondary",
          fontWeight: 700,
          mt: 1
        }}>
        {labelText}
      </Typography>
      {caption && (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            textAlign: 'center',
            mt: 0.25
          }}>
          {caption}
        </Typography>
      )}
    </Box>
  );
}
