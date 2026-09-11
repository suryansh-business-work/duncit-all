import { Box, ButtonBase } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  images: readonly string[];
  alt: string;
  onZoom: (index: number) => void;
}

const RAIL_SX = {
  display: 'flex',
  gap: 1,
  overflowX: 'auto',
  scrollSnapType: 'x mandatory',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
} as const;

/** The product's hero carousel: full-width 24px-corner slides that snap one at
 * a time (the next one peeks when there are several). Tapping a slide opens the
 * zoom lightbox. */
export default function ProductGallery({ images, alt, onZoom }: Readonly<Props>) {
  const { t } = useTranslation();
  const slideWidth = images.length > 1 ? '86%' : '100%';
  return (
    <Box sx={RAIL_SX}>
      {images.map((url, imageIndex) => (
        <ButtonBase
          key={url}
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
    </Box>
  );
}
