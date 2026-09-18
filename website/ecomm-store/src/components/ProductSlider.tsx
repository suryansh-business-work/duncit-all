import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Stack, useMediaQuery } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

import type { StoreProductCard } from '../graphql/catalog';
import { useStoreT } from '../i18n';
import { CircleButton } from './CircleButton';
import { ProductCard } from './product-card';

const EDGE_SLACK = 4;

/**
 * A horizontally scrolling rail of pastel cards: snap scrolling and touch drag
 * on a phone, arrow buttons on a desktop that switch off at either end. Each
 * card has a fixed width so nothing shifts as images arrive; the arrows scroll
 * instantly for someone who asked for reduced motion.
 */
export function ProductSlider({ products, label }: Readonly<{ products: StoreProductCard[]; label: string }>) {
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
  }, [measure, products.length]);

  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Stack
        ref={track}
        component="ul"
        direction="row"
        spacing={1.5}
        aria-label={label}
        tabIndex={0}
        onScroll={measure}
        sx={{
          listStyle: 'none',
          p: 0,
          m: 0,
          pb: 1,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {products.map((product, position) => (
          <Box component="li" key={product.id} sx={{ flex: '0 0 auto', width: { xs: 168, sm: 210 }, scrollSnapAlign: 'start' }}>
            <ProductCard product={product} position={position} />
          </Box>
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', display: { xs: 'none', md: 'flex' }, mt: 1 }}>
        <CircleButton aria-label={t('ecommStore.slider.previous', { vars: { name: label } })} disabled={edges.start} onClick={() => scroll(-1)}>
          <ChevronLeftRoundedIcon />
        </CircleButton>
        <CircleButton aria-label={t('ecommStore.slider.next', { vars: { name: label } })} disabled={edges.end} onClick={() => scroll(1)}>
          <ChevronRightRoundedIcon />
        </CircleButton>
      </Stack>
    </Box>
  );
}
