import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, alpha, type SxProps, type Theme } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from './i18n/useTranslation';

export interface ScrollRailProps {
  children: ReactNode;
  /** Space between entries, in theme spacing units (1.5 = 12px cards, 1 = 8px chips). */
  gap?: number;
  /** Root test id — the arrow buttons get `${testId}-scroll-prev` / `-scroll-next`. */
  testId?: string;
  /** Bleeds past the page's 16px gutter to the screen edge (Home-rail style). */
  bleed?: boolean;
  /** Extra sx merged onto the scroll container — a card surface, custom padding/minHeight. */
  sx?: SxProps<Theme>;
  /** Extra sx merged onto the inner content row — e.g. horizontal inset baked into the scrollable width. */
  contentSx?: SxProps<Theme>;
  /** Cross-axis alignment of the row; default 'stretch'. */
  alignItems?: 'stretch' | 'flex-start' | 'center' | 'flex-end';
}

const EDGE_TOLERANCE = 4;
const ARROW_SIZE = 32;

function arrowSx(theme: Theme, side: 'left' | 'right') {
  return {
    position: 'absolute' as const,
    top: '50%',
    [side]: 4,
    transform: 'translateY(-50%)',
    zIndex: 2,
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    minHeight: ARROW_SIZE,
    bgcolor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    boxShadow: theme.shadows[3],
    border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
    '&:hover': { bgcolor: theme.palette.action.hover },
    '&.Mui-disabled': { opacity: 0, pointerEvents: 'none' as const },
  };
}

/**
 * A sideways-scrolling row of cards with left/right arrow buttons layered
 * over its edges — click-to-scroll for mouse/trackpad users alongside the
 * touch swipe every rail already supported. The arrows hide entirely when the
 * row doesn't overflow its container, and fade out individually at whichever
 * edge has nothing left to scroll to.
 *
 * Renders in mWeb and every portal (rule 40 — one copy, not nineteen). Native
 * twin: `ScrollRail` in `app/mobile-app/src/components/ScrollRail`.
 */
export function ScrollRail({
  children,
  gap = 1.5,
  testId,
  bleed = false,
  sx,
  contentSx,
  alignItems = 'stretch',
}: Readonly<ScrollRailProps>) {
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // The scroller Box below renders unconditionally, so its ref is always set
  // by the time an effect or an arrow click reads it — no null guard, which
  // would be a branch nothing can reach under this package's 100% gate.
  useEffect(() => {
    const el = scrollerRef.current as HTMLDivElement;
    const updateEdges = () => {
      setScrollable(el.scrollWidth > el.clientWidth + EDGE_TOLERANCE);
      setCanScrollLeft(el.scrollLeft > EDGE_TOLERANCE);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_TOLERANCE);
    };
    updateEdges();
    const resizeObserver = new ResizeObserver(updateEdges);
    resizeObserver.observe(el);
    el.addEventListener('scroll', updateEdges, { passive: true });
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener('scroll', updateEdges);
    };
    // Children count/width changes must re-measure.
  }, [children]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollerRef.current as HTMLDivElement;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {scrollable && (
        <DuncitIconButton
          data-testid={testId ? `${testId}-scroll-prev` : undefined}
          aria-label={t('ui.scrollRail.previous')}
          disabled={!canScrollLeft}
          onClick={() => scrollByPage(-1)}
          sx={(theme: Theme) => arrowSx(theme, 'left')}
        >
          <ChevronLeftIcon fontSize="small" />
        </DuncitIconButton>
      )}
      <Box
        ref={scrollerRef}
        data-testid={testId}
        sx={{
          ...(bleed ? { mx: -2, px: 2 } : {}),
          overflowX: 'auto',
          scrollbarWidth: 'none',
          pb: bleed ? 0.5 : 1,
          '&::-webkit-scrollbar': { display: 'none' },
          ...sx,
        }}
      >
        <Box sx={{ display: 'flex', gap, width: 'max-content', alignItems, ...contentSx }}>{children}</Box>
      </Box>
      {scrollable && (
        <DuncitIconButton
          data-testid={testId ? `${testId}-scroll-next` : undefined}
          aria-label={t('ui.scrollRail.next')}
          disabled={!canScrollRight}
          onClick={() => scrollByPage(1)}
          sx={(theme: Theme) => arrowSx(theme, 'right')}
        >
          <ChevronRightIcon fontSize="small" />
        </DuncitIconButton>
      )}
    </Box>
  );
}
