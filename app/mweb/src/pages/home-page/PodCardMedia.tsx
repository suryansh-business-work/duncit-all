import { useEffect, useRef } from 'react';
import { Box, CardMedia } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { imageSourceUrl, isVideoMedia, videoSourceUrl } from '@duncit/utils';
import { logs } from '@duncit/logs';

interface Media {
  url: string;
  type: string;
}

const FILL_SX = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } as const;

/** A card's widest render in device pixels — native's twin asks for the same. */
const CARD_IMAGE_WIDTH = 720;

/**
 * A card's silent looping video, downloaded and played only while it is on
 * screen. As a plain `autoPlay` every card in the feed fetched its video at
 * once, and those downloads crowded out the images and API calls the visible
 * cards were waiting on.
 */
function CardVideo({ src }: Readonly<{ src: string }>) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // A pause that lands before playback starts rejects play() — expected.
          video.play().catch((error) => logs.mWeb.debug('PodCardMedia', 'play', { error }));
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return <Box component="video" ref={ref} src={src} muted loop playsInline preload="none" sx={FILL_SX} />;
}

/** The pod card's image area: image, silent looping video, or a calm soft
 * panel with an event glyph when a pod has no media yet. */
export default function PodCardMedia({
  media,
  title,
}: Readonly<{ media?: Media | null; title: string }>) {
  if (!media) {
    return (
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
        }}
      >
        <EventIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
      </Box>
    );
  }
  if (isVideoMedia(media)) return <CardVideo src={videoSourceUrl(media.url)} />;
  // Card-sized, lazy and async-decoded: a feed mounts every card, and the full
  // stored photo, eagerly, was a download and a main-thread decode for cards far
  // below the fold at 3-4x the bytes the card could show.
  return (
    <CardMedia
      component="img"
      image={imageSourceUrl(media.url, CARD_IMAGE_WIDTH)}
      alt={title}
      loading="lazy"
      decoding="async"
      sx={FILL_SX}
    />
  );
}
