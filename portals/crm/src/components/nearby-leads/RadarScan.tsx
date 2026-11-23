import { Box, Stack, Typography, keyframes } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

const sweep = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;
const ping = keyframes`
  0% { transform: scale(0.2); opacity: 0.9; }
  100% { transform: scale(1); opacity: 0; }
`;
const blink = keyframes`
  0%, 100% { opacity: 0; transform: scale(0.4); }
  12% { opacity: 1; transform: scale(1); }
  55% { opacity: 0.2; transform: scale(0.8); }
`;

/** Where the decorative blips light up (percent of the dish), and when. */
const BLIPS = [
  { top: 26, left: 62, delay: 0.3 },
  { top: 64, left: 72, delay: 1 },
  { top: 70, left: 30, delay: 1.6 },
  { top: 34, left: 24, delay: 2.1 },
] as const;
const RINGS = [0.25, 0.5, 0.75] as const;
const SWEEP_SECONDS = 2.4;

/**
 * A radar dish sweeping for leads, shown while a Nearby leads search runs.
 * The dish is decoration (hidden from assistive tech); `label` is announced
 * as a live status. Motion stops for people who ask for reduced motion.
 */
export default function RadarScan({ label }: Readonly<{ label: string }>) {
  const theme = useTheme();
  const main = theme.palette.primary.main;
  const line = alpha(main, 0.3);
  const fill = (ratio: number) => `${ratio * 100}%`;

  return (
    <Stack spacing={2} sx={{ alignItems: 'center', py: 2 }} data-testid="nearby-radar">
      <Box
        aria-hidden
        sx={{
          position: 'relative',
          width: theme.spacing(26),
          height: theme.spacing(26),
          borderRadius: '50%',
          overflow: 'hidden',
          bgcolor: alpha(main, 0.06),
          border: 1,
          borderColor: alpha(main, 0.45),
          boxShadow: theme.shadows[3],
          '@media (prefers-reduced-motion: reduce)': { '& *': { animation: 'none !important' } },
        }}
      >
        {RINGS.map((ratio) => (
          <Box
            key={ratio}
            sx={{
              position: 'absolute',
              inset: fill((1 - ratio) / 2),
              borderRadius: '50%',
              border: 1,
              borderColor: line,
            }}
          />
        ))}
        <Box sx={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: 1, borderColor: line }} />
        <Box sx={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: 1, borderColor: line }} />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `conic-gradient(from 0deg, transparent 0deg, transparent 280deg, ${alpha(main, 0.55)} 360deg)`,
            animation: `${sweep} ${SWEEP_SECONDS}s linear infinite`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: 2,
            borderColor: alpha(main, 0.5),
            animation: `${ping} ${SWEEP_SECONDS}s ease-out infinite`,
          }}
        />
        {BLIPS.map((blip) => (
          <Box
            key={`${blip.top}-${blip.left}`}
            sx={{
              position: 'absolute',
              top: `${blip.top}%`,
              left: `${blip.left}%`,
              width: theme.spacing(1.25),
              height: theme.spacing(1.25),
              borderRadius: '50%',
              bgcolor: 'secondary.main',
              boxShadow: `0 0 ${theme.spacing(1.5)} ${alpha(theme.palette.secondary.main, 0.8)}`,
              opacity: 0,
              animation: `${blink} ${SWEEP_SECONDS}s ease-in-out ${blip.delay}s infinite`,
            }}
          />
        ))}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: theme.spacing(1.5),
            height: theme.spacing(1.5),
            borderRadius: '50%',
            bgcolor: 'primary.main',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </Box>
      <Typography role="status" aria-live="polite" variant="body2" sx={{ fontWeight: 600, textAlign: 'center' }}>
        {label}
      </Typography>
    </Stack>
  );
}
