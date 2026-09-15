import { Box, ButtonBase } from '@mui/material';
import { ScrollRail } from '@duncit/ui';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  images: readonly string[];
  alt: string;
  onZoom: (index: number) => void;
}

/** The product's hero carousel: full-width 24px-corner slides that snap one at
 * a time (the next one peeks when there are several). Tapping a slide opens the
 * zoom lightbox. */
export default function ProductGallery({ images, alt, onZoom }: Readonly<Props>) {
  const { t } = useTranslation();
  const slideWidth = images.length > 1 ? '86%' : '100%';
  return (
    <ScrollRail testId="product-gallery" gap={1} sx={{ scrollSnapType: 'x mandatory' }}>
      {images.map((url, imageIndex) => (
        <ButtonBase
          key={url}
          data-testid={`product-gallery-slide-${url}`}
          aria-label={t('mweb.common.zoomImage')}
          onClick={() => onZoom(imageIndex)}
          sx={{
            flex: `0 0 ${slideWidth}`,
            aspectRatio: '1 / 1',
            borderRadius: '24px',
            overflow: 'hidden',
            bgcolor: 'action.hover',
            scrollSnapAlign: 'start',
            cursor: 'zoom-in',
          }}
        >
          <Box component="img" src={url} alt={alt} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </ButtonBase>
      ))}
    </ScrollRail>
  );
}
