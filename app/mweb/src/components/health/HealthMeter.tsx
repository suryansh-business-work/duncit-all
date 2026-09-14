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

/** Band → the theme's semantic palette, so the gauge flips with light/dark. */
const BAND_PALETTE: Record<HealthBand, 'error' | 'warning' | 'success'> = {
  RED: 'error',
  YELLOW: 'warning',
  GREEN: 'success',
};

const METER_SX = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  outline: 'none',
  transition: 'transform 120ms ease',
} as const;

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
  const trackColor = alpha(theme.palette.text.primary, 0.06);
  const radius = (size - thickness) / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const filled = (safeScore / 100) * circumference;
  const color = theme.palette[BAND_PALETTE[band]].main;
  const height = size / 2 + thickness;
  // The half circle is drawn where it is shown — left end, over the top, right
  // end — rather than drawing a full circle, rotating the <svg> 180° and
  // clipping the bottom half. Keeps this identical to the native twin, whose
  // rotation is dropped when the app renders as web.
  const arc = `M ${thickness / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - thickness / 2} ${cy}`;

  const body = (
    <>
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
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
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
    </>
  );

  if (!onClick) {
    return (
      <Box data-testid="health-meter" sx={{ ...METER_SX, cursor: 'default' }}>
        {body}
      </Box>
    );
  }

  // Tappable meter: a keyboard-operable button (2.1.1).
  return (
    <Box
      data-testid="health-meter"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        ...METER_SX,
        cursor: 'pointer',
        '&:focus-visible': { boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}` },
        '&:hover': { transform: 'translateY(-1px)' },
      }}
    >
      {body}
    </Box>
  );
}
