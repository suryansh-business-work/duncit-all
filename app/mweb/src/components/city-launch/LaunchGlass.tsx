import type { ReactNode } from 'react';
import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorderRounded';

/**
 * The frosted panel every block of the waitlist sits in: a dark translucent
 * fill with a hairline edge, blurred over the backdrop. The numbers are the
 * ones native draws with (rule 27); the blur is the one thing native cannot.
 */
export const GLASS_SX = {
  bgcolor: 'rgba(20, 20, 28, 0.55)',
  border: '1px solid rgba(255, 255, 255, 0.16)',
  borderRadius: '24px',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
} as const;

export function LaunchGlass({
  children,
  testId,
  sx,
}: Readonly<{ children: ReactNode; testId?: string; sx?: SxProps<Theme> }>) {
  return (
    <Box data-testid={testId} sx={[GLASS_SX, { p: 2.5 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Box>
  );
}

/** The role's name in a small dark capsule — HOST, VENUE PARTNER, CLUB ADMIN. */
export function LaunchBadge({ icon, label, testId }: Readonly<{ icon: ReactNode; label: string; testId?: string }>) {
  return (
    <Stack
      data-testid={testId}
      direction="row"
      spacing={0.75}
      sx={{
        alignSelf: 'center',
        alignItems: 'center',
        px: 1.75,
        py: 0.75,
        borderRadius: 999,
        bgcolor: 'rgba(9, 9, 15, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.28)',
        color: 'common.white',
        '& svg': { fontSize: 18, color: 'accent.main' },
      }}
    >
      {icon}
      <Typography component="span" sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {label}
      </Typography>
    </Stack>
  );
}

/** The section's headline, with the red stroke drawn under its last line. */
export function LaunchHeadline({ children, testId }: Readonly<{ children: ReactNode; testId?: string }>) {
  return (
    <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
      <Typography
        data-testid={testId}
        component="h2"
        sx={{ fontSize: { xs: 34, sm: 40 }, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.02em' }}
      >
        {children}
      </Typography>
      <Box
        aria-hidden
        sx={{ width: 120, height: 5, borderRadius: 999, bgcolor: 'primary.main', transform: 'rotate(-1.5deg)' }}
      />
    </Stack>
  );
}

/** The small hand-written aside at the top of a section ("Same city. New people."). */
export function LaunchTagline({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Typography sx={{ alignSelf: 'flex-end', fontSize: 14, fontStyle: 'italic', lineHeight: 1.3, opacity: 0.92 }}>
      {children}
    </Typography>
  );
}

/** The closing line at the foot of a section, spaced out in capitals with the heart after it. */
export function LaunchFooterLine({ children, testId }: Readonly<{ children: ReactNode; testId?: string }>) {
  return (
    <Stack
      data-testid={testId}
      direction="row"
      spacing={1}
      sx={{ ...GLASS_SX, alignSelf: 'center', alignItems: 'center', px: 2, py: 1, borderRadius: 999 }}
    >
      <Typography
        component="p"
        sx={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'center' }}
      >
        {children}
      </Typography>
      <FavoriteBorderIcon aria-hidden sx={{ fontSize: 18, color: 'accent.main' }} />
    </Stack>
  );
}
