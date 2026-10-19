import type { Theme } from '@mui/material/styles';

/**
 * Lists inside a details-page card (the chat card, the Pod Shop) keep one
 * height and scroll inside it, so a long chat or a big shop never stretches
 * the page and a short one never makes it jump. In theme spacing units.
 */
const PANEL_SPACING = 45;

const innerScroll = { overflowY: 'auto', overscrollBehavior: 'contain' } as const;

/** Always this tall: the chat card's body, whatever it holds (loading, empty, lines). */
export const FIXED_PANEL_SX = {
  ...innerScroll,
  height: (theme: Theme) => theme.spacing(PANEL_SPACING),
} as const;

/** At most this tall: a shop list grows with its first rows, then scrolls. */
export const CAPPED_PANEL_SX = {
  ...innerScroll,
  maxHeight: (theme: Theme) => theme.spacing(PANEL_SPACING),
} as const;
