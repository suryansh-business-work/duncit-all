import type { ReactElement, ReactNode } from 'react';
import { Badge, Box, Tooltip } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { tokens } from '@duncit/theme';
import type { NavBadge } from '../../types';
import { hasNavBadge, navBadgeText } from './helpers';

/**
 * The red count's motion: a short double hop every few seconds and a ring that
 * swells out of it, so waiting work catches the eye without flashing. Both
 * stop for anyone who asked their system for less motion (WCAG 2.3.3).
 */
const motionSx = (theme: Theme) => ({
  animation: 'duncitNavBadgeJump 2.8s ease-in-out infinite, duncitNavBadgePulse 2.8s ease-out infinite',
  '@keyframes duncitNavBadgeJump': {
    '0%, 24%, 100%': { transform: 'translateY(0)' },
    '6%': { transform: `translateY(-${theme.spacing(0.5)})` },
    '12%': { transform: 'translateY(0)' },
    '18%': { transform: `translateY(-${theme.spacing(0.25)})` },
  },
  '@keyframes duncitNavBadgePulse': {
    '0%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.error.main, tokens.state.tintBorder.dark)}` },
    '40%, 100%': { boxShadow: `0 0 0 ${theme.spacing(0.75)} ${alpha(theme.palette.error.main, 0)}` },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
});

const pillSx = (theme: Theme) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: tokens.size.icon.md,
  height: tokens.size.icon.md,
  px: 0.625,
  borderRadius: `${tokens.radius.lg}px`,
  bgcolor: 'error.main',
  color: 'error.contrastText',
  fontSize: tokens.font.size.overline,
  fontWeight: tokens.font.weight.bold,
  lineHeight: 1,
  ...motionSx(theme),
});

/** Hidden from sight but read out: the standard screen-reader-only clip. */
const spokenSx = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

/** What a screen reader hears in place of the bare number. */
function SpokenLabel({ badge }: Readonly<{ badge: NavBadge }>) {
  return (
    <Box component="span" sx={spokenSx}>
      {badge.label ?? navBadgeText(badge.count)}
    </Box>
  );
}

/**
 * Hovering (or focusing) a row with waiting work says what is waiting, e.g.
 * "3 waiting for your action". `describeChild` keeps the row's own name — a
 * string title would otherwise replace the link's accessible name. The Tooltip
 * stays mounted with an empty (never shown) title when nothing waits, so a group
 * header that drops its badge on opening keeps its element, and with it focus.
 */
export function NavBadgeTooltip({ badge, children }: Readonly<{ badge?: NavBadge | null; children: ReactElement }>) {
  const title = hasNavBadge(badge) ? (badge.label ?? '') : '';
  return (
    <Tooltip title={title} placement="right" describeChild>
      {children}
    </Tooltip>
  );
}

interface Props {
  badge?: NavBadge | null;
  /** Given, the count sits on this (the icon rail's glyph) instead of beside a label. */
  children?: ReactNode;
}

/**
 * An animated red count for a nav entry with work waiting on the user
 * (`AppNavItem.badge`). Beside a label it is a pill; around `children` it sits
 * on the glyph's corner. A missing or zero badge renders the children alone
 * (or nothing), so callers never branch on it.
 */
export function NavCountBadge({ badge, children }: Readonly<Props>) {
  if (!hasNavBadge(badge)) return <>{children}</>;
  if (children !== undefined) {
    return (
      <Badge
        badgeContent={navBadgeText(badge.count)}
        color="error"
        data-testid="shell-nav-badge"
        slotProps={{ badge: { 'aria-hidden': true } }}
        sx={(theme) => ({ '& .MuiBadge-badge': motionSx(theme) })}
      >
        {children}
        <SpokenLabel badge={badge} />
      </Badge>
    );
  }
  return (
    <Box component="span" data-testid="shell-nav-badge" sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0, ml: 1 }}>
      <Box component="span" aria-hidden sx={pillSx}>
        {navBadgeText(badge.count)}
      </Box>
      <SpokenLabel badge={badge} />
    </Box>
  );
}
