import { Box, ButtonBase, Stack } from '@mui/material';
import { venueVideosOf } from '@duncit/forms/schemas';
import SectionHeader from '../../components/SectionHeader';
import VenueVideoPlayer from '../../components/media/VenueVideoPlayer';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** Every venue image, cover first — the grid renders all but the cover. */
  images: string[];
  venueName: string;
  /** Index into `images`, so the caller opens the lightbox on the same list. */
  onOpen: (index: number) => void;
  /** The venue's videos — uploaded clips or YouTube links — played under the photos. */
  videos?: string[];
}

/** The venue's remaining photos as a tap-to-maximise grid, then its videos.
 * Native twin: the gallery block in VenueDetailsScreen. */
export default function VenueImagesGrid({ images, venueName, onOpen, videos }: Readonly<Props>) {
  const { t } = useTranslation();
  const playable = venueVideosOf(videos);
  if (images.length < 2 && playable.length === 0) return null;

  return (
    <Stack spacing={1.25} data-testid="venue-images-grid">
      {images.length > 1 && (
        <>
          <SectionHeader testId="venue-images-grid-header" title={t('mweb.venues.images')} />
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' } }}>
            {images.slice(1).map((url, tileIndex) => (
              <ButtonBase
                key={url}
                onClick={() => onOpen(tileIndex + 1)}
                focusRipple
                aria-label={t('mweb.podDetails.viewImage')}
                sx={{ width: '100%', aspectRatio: '4 / 3', borderRadius: '18px', overflow: 'hidden' }}
                data-testid="venue-gallery-image"
              >
                <Box component="img" src={url} alt={venueName} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </ButtonBase>
            ))}
          </Box>
        </>
      )}
      {playable.length > 0 && (
        <>
          <SectionHeader testId="venue-videos-header" title={t('mweb.venueFood.videos')} />
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {playable.map((video, index) => (
              <VenueVideoPlayer
                key={video.url}
                video={video}
                title={t('mweb.venueFood.videoTitle', { vars: { n: index + 1, name: venueName } })}
                testId={`venue-video-${index}`}
              />
            ))}
          </Box>
        </>
      )}
    </Stack>
  );
}
