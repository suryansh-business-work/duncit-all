import type { ReactNode } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTranslation } from '../i18n/useTranslation';
import { mergeSx } from '../mergeSx';

/**
 * The four shapes a wait actually takes on a Duncit console.
 *
 * - `block`   — a section that has nothing to draw yet: a centred spinner where
 *               the content will be. The default, and what `QueryGuard` renders.
 * - `page`    — the whole viewport, before the shell itself can draw (boot,
 *               session resolution).
 * - `inline`  — beside or inside a control: a small spinner on the text
 *               baseline, optionally with its label.
 * - `overlay` — a card, table or panel that ALREADY has content and is being
 *               refreshed: the stale data stays readable under a scrim rather
 *               than being replaced by a spinner, which is what makes a
 *               refetch feel like a refresh instead of a reload.
 */
export type LoaderVariant = 'block' | 'page' | 'inline' | 'overlay';

export interface LoaderProps {
  variant?: LoaderVariant;
  /** Spinner diameter in px. Defaults per variant (page 44, inline 16, else 40). */
  size?: number;
  /**
   * What is being waited on. Read out to screen readers on every variant, and
   * shown beside the spinner on `inline`/`overlay`. Defaults to `Loading…`.
   *
   * Pass a localized string — this is user-facing copy (rule 38).
   */
  label?: string;
  /** `inline` and `overlay` only: draw `label` beside the spinner. */
  showLabel?: boolean;
  sx?: SxProps<Theme>;
}

const SIZES: Record<LoaderVariant, number> = { block: 40, page: 44, inline: 16, overlay: 32 };

const LAYOUT: Record<LoaderVariant, SxProps<Theme>> = {
  block: { alignItems: 'center', justifyContent: 'center', py: 6 },
  page: { alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' },
  inline: { display: 'inline-flex', alignItems: 'center', gap: 1, verticalAlign: 'middle' },
  overlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
    // Tinted from the theme's own paper rather than a fixed white/black, so the
    // scrim reads the same in light and dark instead of inverting.
    bgcolor: (theme) => theme.palette.background.paper,
    opacity: 0.72,
    zIndex: 1,
  },
};

/**
 * The one loading indicator in mWeb and the 17 portals.
 *
 * Before this, every surface hand-rolled the same three lines — a `CircularProgress`
 * inside a centred `Stack` — which is why some waits showed a spinner, some
 * showed nothing, and no two were the same size. One component, four shapes
 * (rule 40).
 *
 * It always announces itself: the wrapper is a live `status` region carrying
 * the label, so a wait is audible to a screen reader even where the spinner is
 * the only thing on screen.
 */
export function Loader({ variant = 'block', size, label, showLabel, sx }: Readonly<LoaderProps>) {
  const { t } = useTranslation();
  const text = label ?? t('ui.loader.loading');
  const withLabel = showLabel && variant !== 'page';
  const direction = variant === 'overlay' ? 'column' : 'row';

  return (
    <Stack
      role="status"
      aria-live="polite"
      aria-label={text}
      direction={direction}
      sx={mergeSx(LAYOUT[variant], sx)}
    >
      <CircularProgress size={size ?? SIZES[variant]} aria-hidden />
      {withLabel ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {text}
        </Typography>
      ) : null}
    </Stack>
  );
}

export interface LoadingOverlayProps extends Omit<LoaderProps, 'variant'> {
  /** Nothing is drawn while false — the wrapper still positions the children. */
  open: boolean;
  children: ReactNode;
  /** The positioned wrapper the scrim is measured against. */
  wrapperSx?: SxProps<Theme>;
}

/**
 * Content that stays on screen while it refreshes.
 *
 * The scrim is absolute, so its parent has to be positioned — which is exactly
 * the line every call site forgot. Wrapping both makes that impossible to get
 * wrong, and gives the pattern one name.
 */
export function LoadingOverlay({ open, children, wrapperSx, ...loader }: Readonly<LoadingOverlayProps>) {
  return (
    <Box sx={mergeSx({ position: 'relative' }, wrapperSx)}>
      {children}
      {open ? <Loader variant="overlay" {...loader} /> : null}
    </Box>
  );
}
