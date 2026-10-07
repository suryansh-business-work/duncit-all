import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, keyframes } from '@mui/material/styles';
import { tokens } from '@duncit/theme';

/** The sweep: a wedge of the brand colour fading to nothing within a quarter turn. */
const sweepGradient = (tint: string): string =>
  ['conic-gradient(from 0deg,', tint, '0deg, transparent 25%)'].join(' ');

const ripple = keyframes`
  from { transform: scale(0.2); opacity: 1; }
  to { transform: scale(1); opacity: 0; }
`;
const sweep = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;
const RIPPLE_STEPS = [0, 1, 2] as const;
const RIPPLES = RIPPLE_STEPS.length;
/** One full turn of the sweep (and one ripple's life), in ms — ten slow motion steps. */
const CYCLE_MS = tokens.motion.slow * 10;
/** The radar's diameter and its centre badge, in theme spacing units. */
const SIZE = 22;
const BADGE = 7;
const LINE = tokens.size.indicator;
const { tint, tintBorder, ring } = tokens.state;

interface Props {
  /** "Searching Nearby Hosts..." / "...Venues..." */
  title: string;
  hint?: string;
  icon: ReactNode;
}

/**
 * The radar shown while a nearby search runs: rings ripple out from the centre
 * icon while a sweep turns. Theme colours and tokens only; with reduced motion
 * asked for, the rings hold still and the sweep is hidden. Announced as a status.
 */
export default function SearchingNearby({ title, hint, icon }: Readonly<Props>) {
  return (
    <Stack role="status" aria-live="polite" spacing={2} sx={{ alignItems: 'center', py: 4 }}>
      <Box
        aria-hidden
        sx={(theme) => ({
          position: 'relative',
          width: theme.spacing(SIZE),
          height: theme.spacing(SIZE),
          borderRadius: '50%',
          overflow: 'hidden',
          bgcolor: alpha(theme.palette.primary.main, tint.light),
          border: `${LINE}px solid ${theme.palette.divider}`,
        })}
      >
        {RIPPLE_STEPS.map((index) => (
          <Box
            key={index}
            sx={(theme) => ({
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `${LINE}px solid ${alpha(theme.palette.primary.main, tintBorder.dark)}`,
              animation: `${ripple} ${CYCLE_MS}ms ${tokens.motion.ease} ${(CYCLE_MS / RIPPLES) * index}ms infinite`,
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
                transform: `scale(${(index + 1) / RIPPLES})`,
              },
            })}
          />
        ))}
        <Box
          sx={(theme) => ({
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: sweepGradient(alpha(theme.palette.primary.main, ring)),
            animation: `${sweep} ${CYCLE_MS}ms linear infinite`,
            '@media (prefers-reduced-motion: reduce)': { display: 'none' },
          })}
        />
        <Box
          sx={(theme) => ({
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: theme.spacing(BADGE),
            height: theme.spacing(BADGE),
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.contrastText',
            bgcolor: 'primary.main',
            boxShadow: theme.shadows[4],
          })}
        >
          {icon}
        </Box>
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {hint}
        </Typography>
      )}
    </Stack>
  );
}
