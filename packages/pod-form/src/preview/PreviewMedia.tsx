import { Box } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';

export interface PreviewMediaProps {
  media?: { url: string; type: string };
  title: string;
  height: number;
}

/**
 * The cover slot of a preview surface. A pod that has no media yet still has to
 * look like a pod, so the empty state is the apps' own gradient panel rather
 * than a broken image box.
 */
export default function PreviewMedia({ media, title, height }: Readonly<PreviewMediaProps>) {
  if (!media) {
    return (
      <Box
        sx={{
          height,
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(145deg, #17111d 0%, #2c1728 56%, #111827 100%)',
        }}
      >
        <EventIcon sx={{ fontSize: 56, color: 'rgba(255,255,255,0.24)' }} />
      </Box>
    );
  }

  if (media.type === 'VIDEO') {
    return (
      <Box
        component="video"
        src={media.url}
        muted
        loop
        playsInline
        autoPlay
        sx={{ width: '100%', height, objectFit: 'cover', display: 'block' }}
      />
    );
  }

  return (
    <Box
      component="img"
      src={media.url}
      alt={title}
      sx={{ width: '100%', height, objectFit: 'cover', display: 'block' }}
    />
  );
}
