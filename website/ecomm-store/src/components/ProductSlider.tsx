import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, Stack, useMediaQuery } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

import type { StoreProductCard } from '../graphql/catalog';
import { useStoreT } from '../i18n';
import { CircleButton } from './CircleButton';
import { ProductCard } from './product-card';

const EDGE_SLACK = 4;
/** The gap between rail items, in theme spacing units. */
const RAIL_GAP = 2;

/** How many items show at once per breakpoint — fractions leave a peek of the next. */
export interface RailVisible {
  xs: number;
  sm: number;
  md: number;
}

/** An item's width in a rail showing `visible` items (gaps included), so nothing shifts as images arrive. */
export function railItemSx(visible: RailVisible): SxProps<Theme> {
  const basis = (theme: Theme, count: number) => `0 0 calc((100% - ${theme.spacing(RAIL_GAP)} * ${Math.ceil(count) - 1}) / ${count})`;
  return (theme: Theme) => ({
    flex: basis(theme, visible.xs),
    minWidth: 0,
    scrollSnapAlign: 'start',
    [theme.breakpoints.up('sm')]: { flex: basis(theme, visible.sm) },
    [theme.breakpoints.up('md')]: { flex: basis(theme, visible.md) },
  });
}

interface ScrollRailProps {
  label: string;
  /** Re-measures the ends when the items change. */
  count: number;
  /** The `<li>` items (size them with `railItemSx`). */
  children: ReactNode;
}

/**
 * A horizontally scrolling list: snap scrolling and touch drag, with arrow
 * buttons from `sm` up that switch off at either end and hide when everything
 * fits. The arrows scroll instantly for someone who asked for reduced motion.
 */
export function ScrollRail({ label, count, children }: Readonly<ScrollRailProps>) {
  const { t } = useStoreT();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= EDGE_SLACK,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE_SLACK,
    });
  }, []);

  useEffect(() => {
    measure();
    globalThis.addEventListener('resize', measure);
    return () => globalThis.removeEventListener('resize', measure);
  }, [measure, count]);

  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reducedMotion ? 'auto' : 'smooth' });
  };
  const fits = edges.start && edges.end;

  return (
    <Box sx={{ position: 'relative' }}>
      <Stack
        ref={track}
        component="ul"
        direction="row"
        aria-label={label}
        tabIndex={0}
        onScroll={measure}
        sx={{
          listStyle: 'none',
          gap: RAIL_GAP,
          p: 0.5,
          m: -0.5,
          pb: 2,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {children}
      </Stack>
      {fits ? null : (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', display: { xs: 'none', sm: 'flex' }, mt: 1 }}>
          <CircleButton aria-label={t('ecommStore.slider.previous', { vars: { name: label } })} disabled={edges.start} onClick={() => scroll(-1)}>
            <ChevronLeftRoundedIcon />
          </CircleButton>
          <CircleButton aria-label={t('ecommStore.slider.next', { vars: { name: label } })} disabled={edges.end} onClick={() => scroll(1)}>
            <ChevronRightRoundedIcon />
          </CircleButton>
        </Stack>
      )}
    </Box>
  );
}

/** Four cards on a desktop, a peek of the next on a phone. */
const PRODUCT_VISIBLE: RailVisible = { xs: 1.7, sm: 3, md: 4 };

/** A scrolling rail of product cards. */
export function ProductSlider({ products, label }: Readonly<{ products: StoreProductCard[]; label: string }>) {
  const itemSx = railItemSx(PRODUCT_VISIBLE);
  return (
    <ScrollRail label={label} count={products.length}>
      {products.map((product, position) => (
        <Box component="li" key={product.id} sx={itemSx}>
          <ProductCard product={product} position={position} />
        </Box>
      ))}
    </ScrollRail>
  );
}
