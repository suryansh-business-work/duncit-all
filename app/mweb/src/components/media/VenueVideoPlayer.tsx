import { Box, Link, Stack } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { VenueVideo } from '@duncit/forms/schemas';
import { useTranslation } from '../../i18n/useTranslation';
import { RADIUS } from '../../theme';

interface Props {
  video: VenueVideo;
  /** What the player is called for a screen reader ("Video 1 of Paneer Tikka"). */
  title: string;
  testId: string;
}

const FRAME_SX = {
  width: '100%',
  aspectRatio: '16 / 9',
  border: 0,
  borderRadius: `${RADIUS.base}px`,
  overflow: 'hidden',
  bgcolor: 'common.black',
  display: 'block',
} as const;

/**
 * One venue or dish video: a YouTube link plays in YouTube's privacy-enhanced
 * embed (with a link out, for a browser that blocks the frame); an uploaded
 * clip plays in a native player on the stored file (`videoSourceUrl`, never a
 * metered re-encode). Nothing plays until the guest presses play.
 */
export default function VenueVideoPlayer({ video, title, testId }: Readonly<Props>) {
  const { t } = useTranslation();

  if (video.kind === 'YOUTUBE') {
    return (
      <Stack spacing={0.5} data-testid={testId}>
        <Box
          component="iframe"
          src={video.embedUrl}
          title={title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sx={FRAME_SX}
        />
        <Link
          href={video.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="caption"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, alignSelf: 'flex-start' }}
        >
          {t('mweb.venueFood.watchOnYoutube')}
          <OpenInNewIcon fontSize="inherit" aria-hidden />
        </Link>
      </Stack>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- owner-uploaded media; no caption track exists in the data model
    <Box
      component="video"
      src={video.sourceUrl}
      controls
      playsInline
      preload="metadata"
      title={title}
      aria-label={title}
      sx={FRAME_SX}
      data-testid={testId}
    />
  );
}
