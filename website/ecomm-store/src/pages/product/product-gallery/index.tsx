import { useId } from 'react';
import { Box, Stack } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

import { CircleButton } from '../../../components/CircleButton';
import { StoreImage } from '../../../components/StoreImage';
import { useCarouselIndex } from '../../../lib/useCarouselIndex';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';
import { GalleryThumbnails } from './GalleryThumbnails';
import { useSwipe } from './useSwipe';

interface ProductGalleryProps {
  images: string[];
  title: string;
}

/** Intrinsic photo size: reserves the square before the bytes arrive. */
const PHOTO_SIZE = 600;
const PHOTO_SX = { objectFit: 'contain' } as const;

/** The plain rectangular frame every product photo sits in. */
const FRAME_SX = {
  width: '100%',
  overflow: 'hidden',
  bgcolor: T.surface,
  border: 1,
  borderColor: T.border,
  borderRadius: `${T.radius.card}px`,
} as const;

/** Centres the arrows over the photo; only the buttons themselves take the pointer. */
const ARROWS_SX = {
  position: 'absolute',
  inset: 0,
  alignItems: 'center',
  justifyContent: 'space-between',
  px: 1,
  pointerEvents: 'none',
  '& > *': { pointerEvents: 'auto' },
} as const;

/**
 * Two or more photos: a sliding track the shopper can swipe, step with the
 * arrows, or pick from the thumbnails. Off-screen slides are hidden from
 * assistive tech; the next photo is fetched ahead, the rest wait their turn.
 */
function GallerySlider({ images, title }: Readonly<ProductGalleryProps>) {
  const { t } = useStoreT();
  const baseId = useId();
  const { index, goTo, next, prev } = useCarouselIndex(images.length);
  const swipe = useSwipe(prev, next);
  const total = images.length;
  const trackId = `${baseId}-track`;
  const slideId = (n: number) => `${baseId}-slide-${n}`;
  return (
    <Stack
      component="section"
      spacing={1.5}
      aria-roledescription={t('ecommStore.hero.carousel')}
      aria-label={t('ecommStore.product.gallery')}
      data-testid="product-gallery"
    >
      <Box {...swipe} sx={{ ...FRAME_SX, position: 'relative', touchAction: 'pan-y pinch-zoom' }}>
        <Box
          id={trackId}
          aria-live="polite"
          sx={{ display: 'flex', transform: `translateX(-${index * 100}%)`, transition: 'transform 300ms ease' }}
        >
          {images.map((src, n) => (
            <Box
              key={src}
              id={slideId(n)}
              role="tabpanel"
              aria-roledescription={t('ecommStore.hero.slide')}
              aria-label={t('ecommStore.hero.slideOf', { vars: { n: n + 1, total } })}
              aria-hidden={n !== index}
              data-testid="product-gallery-slide"
              sx={{ flex: '0 0 100%', minWidth: 0 }}
            >
              <StoreImage src={src} alt={title} width={PHOTO_SIZE} height={PHOTO_SIZE} eager={Math.abs(n - index) <= 1} sx={PHOTO_SX} />
            </Box>
          ))}
        </Box>
        <Stack direction="row" sx={ARROWS_SX}>
          <CircleButton aria-label={t('ecommStore.product.previousImage')} aria-controls={trackId} onClick={prev} data-testid="product-gallery-previous">
            <ChevronLeftRoundedIcon />
          </CircleButton>
          <CircleButton aria-label={t('ecommStore.product.nextImage')} aria-controls={trackId} onClick={next} data-testid="product-gallery-next">
            <ChevronRightRoundedIcon />
          </CircleButton>
        </Stack>
      </Box>
      <GalleryThumbnails images={images} index={index} slideId={slideId} onSelect={goTo} />
    </Stack>
  );
}

/**
 * The product's photos in a plain rectangular frame. A single photo shows on
 * its own with no controls. A new photo set — a variant with its own photos was
 * picked — mounts a fresh slider, so it opens on that variant's first photo.
 */
export function ProductGallery({ images, title }: Readonly<ProductGalleryProps>) {
  if (images.length > 1) return <GallerySlider key={images.join('\n')} images={images} title={title} />;
  return (
    <Box sx={FRAME_SX} data-testid="product-gallery">
      <StoreImage src={images[0] ?? ''} alt={title} width={PHOTO_SIZE} height={PHOTO_SIZE} eager sx={PHOTO_SX} />
    </Box>
  );
}
