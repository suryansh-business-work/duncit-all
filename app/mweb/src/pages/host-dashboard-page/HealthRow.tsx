import { Box, ButtonBase, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import type { HealthBand } from '../../components/health/HealthMeter';
import { SURFACE_SX } from '../../theme';

const BAND_TONE: Record<HealthBand, 'success' | 'warning' | 'error'> = {
  GREEN: 'success',
  YELLOW: 'warning',
  RED: 'error',
};

interface Props {
  score: number;
  band: HealthBand;
  label: string;
  ariaLabel: string;
  onOpen: () => void;
}

/**
 * The host's profile/verification health as one tappable row: the score in a
 * band-coloured disc, the title, a chevron to the detail page.
 * Native twin: the `host-health` row on HostDashboardScreen.
 */
export default function HealthRow({ score, band, label, ariaLabel, onOpen }: Readonly<Props>) {
  const tone = BAND_TONE[band] ?? 'error';
  return (
    <ButtonBase
      onClick={onOpen}
      aria-label={ariaLabel}
      sx={{ ...SURFACE_SX, p: 2, gap: 1.5, width: '100%', justifyContent: 'flex-start', textAlign: 'left' }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: `${tone}.main`,
          color: 'primary.contrastText',
          fontSize: '1rem',
          fontWeight: 700,
        }}
      >
        {score}
      </Box>
      <Typography sx={{ flex: 1, minWidth: 0, fontSize: '1rem', fontWeight: 600 }}>{label}</Typography>
      <ChevronRightRoundedIcon sx={{ color: 'text.secondary' }} />
    </ButtonBase>
  );
}
