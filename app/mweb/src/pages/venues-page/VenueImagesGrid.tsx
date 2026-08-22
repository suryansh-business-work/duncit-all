import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** Every venue image, cover first — the grid renders all but the cover. */
  images: string[];
  venueName: string;
  /** Index into `images`, so the caller opens the lightbox on the same list. */
  onOpen: (index: number) => void;
}

/** The venue's remaining photos as a tap-to-maximise grid. Native twin: the
 * gallery block in VenueDetailsScreen. */
export default function VenueImagesGrid({ images, venueName, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  if (images.length < 2) return null;

  return (
    <Stack spacing={1}>
      <Typography variant="h6" fontWeight={700}>{t('mweb.venues.images')}</Typography>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' } }}>
        {images.slice(1).map((url, tileIndex) => (
          <ButtonBase
            key={url}
            onClick={() => onOpen(tileIndex + 1)}
            focusRipple
            aria-label={t('mweb.podDetails.viewImage')}
            sx={{ width: '100%', aspectRatio: '4 / 3', borderRadius: '16px', overflow: 'hidden' }}
          >
            <Box component="img" src={url} alt={venueName} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </ButtonBase>
        ))}
      </Box>
    </Stack>
  );
}
