import { useRef, type KeyboardEvent } from 'react';
import { ButtonBase, Stack } from '@mui/material';

import { StoreImage } from '../../../components/StoreImage';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';

interface GalleryThumbnailsProps {
  images: string[];
  index: number;
  /** The id of photo n's slide, which its tab controls. */
  slideId: (n: number) => string;
  onSelect: (n: number) => void;
}

/** The photo a key moves to — possibly one past either end — or null for any other key. */
function keyTarget(key: string, index: number, total: number): number | null {
  if (key === 'ArrowRight') return index + 1;
  if (key === 'ArrowLeft') return index - 1;
  if (key === 'Home') return 0;
  if (key === 'End') return total - 1;
  return null;
}

/**
 * The photo picker: one tab per photo (the APG tabbed carousel). Left / Right
 * move and show at once, wrapping at the ends; Home / End jump to the first and
 * last; only the current tab sits in the Tab order.
 */
export function GalleryThumbnails({ images, index, slideId, onSelect }: Readonly<GalleryThumbnailsProps>) {
  const { t } = useStoreT();
  const listRef = useRef<HTMLDivElement>(null);
  const total = images.length;
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = keyTarget(event.key, index, total);
    if (target === null) return;
    event.preventDefault();
    const wrapped = (target + total) % total;
    onSelect(wrapped);
    listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[wrapped]?.focus();
  };
  return (
    <Stack
      ref={listRef}
      direction="row"
      spacing={1.5}
      role="tablist"
      aria-label={t('ecommStore.product.photoPicker')}
      data-testid="product-gallery-thumbnails"
      sx={{ overflowX: 'auto', maxWidth: '100%', p: 0.5 }}
    >
      {images.map((src, n) => {
        const selected = n === index;
        return (
          <ButtonBase
            key={src}
            role="tab"
            aria-selected={selected}
            aria-controls={slideId(n)}
            aria-label={t('ecommStore.product.showImage', { vars: { n: n + 1, total } })}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(n)}
            onKeyDown={onKeyDown}
            data-testid="product-gallery-thumbnail"
            sx={{
              flexShrink: 0,
              width: 64,
              height: 64,
              overflow: 'hidden',
              borderRadius: `${T.radius.control}px`,
              bgcolor: T.surface,
              border: 2,
              borderColor: selected ? T.brand : T.border,
            }}
          >
            <StoreImage src={src} alt="" width={64} height={64} sx={{ objectFit: 'contain' }} />
          </ButtonBase>
        );
      })}
    </Stack>
  );
}
