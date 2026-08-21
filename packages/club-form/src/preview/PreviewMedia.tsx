import { Box } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';

export interface PreviewMediaProps {
  media?: { url: string; type: string };
  title: string;
  height: number;
}

/**
 * The cover slot of a preview surface. A club with no media yet still has to
 * look like a club, so the empty state is the apps' own gradient panel rather
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
          background: 'linear-gradient(135deg, #ff8b5f 0%, #ed4f7a 50%, #35158a 100%)',
        }}
      >
        <GroupsIcon sx={{ fontSize: 56, color: 'rgba(255,255,255,0.32)' }} />
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
