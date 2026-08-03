import { Box, CardMedia } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';

interface Media {
  url: string;
  type: string;
}

/** The pod card's full-bleed background media: image, silent looping video, or
 * the brand-gradient fallback when a pod has no media yet. */
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
          background: 'linear-gradient(145deg, #ff8b5f 0%, #ed4f7a 50%, #16121f 100%)',
        }}
      >
        <EventIcon fontSize="large" sx={{ color: 'common.white' }} />
      </Box>
    );
  }
  if (media.type === 'VIDEO') {
    return (
      <Box
        component="video"
        src={media.url}
        autoPlay
        muted
        loop
        playsInline
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }
  return (
    <CardMedia
      component="img"
      image={media.url}
      alt={title}
      sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}
