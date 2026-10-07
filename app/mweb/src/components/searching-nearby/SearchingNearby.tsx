import type { ReactNode } from 'react';
import { Box, Stack, Typography, alpha, keyframes } from '@mui/material';

const ripple = keyframes`
  from { transform: scale(0.35); opacity: 0.55; }
  to { transform: scale(1); opacity: 0; }
`;
const sweep = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;
const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

/** Three rings, a third of the cycle apart, so one is always leaving the centre. */
const RIPPLE_SECONDS = 2.4;
const RIPPLES = [0, 1, 2];
const SIZE = 168;

/** The sweep: a 70° wedge of the brand colour fading to nothing (ContactsRadar's shape). */
const sweepGradient = (tint: string): string =>
  ['conic-gradient(from 0deg,', tint, '0deg, transparent 70deg)'].join(' ');

interface Props {
  /** "Searching Nearby Hosts..." / "Searching Nearby Venues...". */
  title: string;
  /** What is being searched — the radius and the place. */
  hint: string;
  /** The centre mark: a host or a venue glyph. */
  icon: ReactNode;
  testId?: string;
}

/**
 * The "Searching nearby…" radar the Pod Request searches show while a search
 * runs: rings ripple out from a centre mark while a soft sweep turns, so the
 * wait reads as "still looking", not "broken". Theme colours only; motion
 * stops for prefers-reduced-motion and the words are announced as a polite
 * status.
 */
export default function SearchingNearby({ title, hint, icon, testId = 'searching-nearby' }: Readonly<Props>) {
  return (
    <Stack
      role="status"
      aria-live="polite"
      spacing={2}
      data-testid={testId}
      sx={{ alignItems: 'center', py: 3, textAlign: 'center' }}
    >
      <Box aria-hidden sx={{ position: 'relative', width: SIZE, height: SIZE }}>
        {RIPPLES.map((index) => (
          <Box
            key={index}
            sx={(theme) => ({
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              animation: `${ripple} ${RIPPLE_SECONDS}s cubic-bezier(0.22, 0.61, 0.36, 1) ${(index * RIPPLE_SECONDS) / RIPPLES.length}s infinite`,
              opacity: 0,
              '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.25, transform: `scale(${0.45 + index * 0.25})` },
            })}
          />
        ))}
        <Box
          sx={(theme) => ({
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: sweepGradient(alpha(theme.palette.primary.main, 0.28)),
            animation: `${sweep} 3s linear infinite`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          })}
        />
        <Box
          sx={(theme) => ({
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: SIZE / 3,
            height: SIZE / 3,
            ml: `${-SIZE / 6}px`,
            mt: `${-SIZE / 6}px`,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            boxShadow: theme.shadows[4],
            animation: `${breathe} ${RIPPLE_SECONDS}s ease-in-out infinite`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          })}
        >
          {icon}
        </Box>
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 320 }}>
        {hint}
      </Typography>
    </Stack>
  );
}
