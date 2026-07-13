import { Box, CircularProgress, ImageListItem, ImageListItemBar, Typography } from '@mui/material';

interface Props {
  photo: any;
  importing: boolean;
  anyImporting: boolean;
  onPick: (photo: any) => void;
}

export default function PexelsPhotoCard({
  photo,
  importing,
  anyImporting,
  onPick,
}: Readonly<Props>) {
  return (
    <ImageListItem
      sx={{
        cursor: 'pointer',
        borderRadius: 1,
        overflow: 'hidden',
        opacity: anyImporting && !importing ? 0.5 : 1,
        position: 'relative',
        '&:hover img': { transform: 'scale(1.04)' },
      }}
      onClick={() => !anyImporting && onPick(photo)}
    >
      <img
        src={photo.src_medium}
        alt={photo.alt || photo.photographer}
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'transform .2s ease',
          background: photo.avg_color || '#eee',
        }}
      />
      <ImageListItemBar
        title={photo.photographer}
        subtitle="Pexels"
        sx={{ background: 'linear-gradient(rgba(0,0,0,.6), transparent)' }}
      />
      {importing && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(0,0,0,.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <CircularProgress size={28} sx={{ color: 'white' }} />
          <Typography variant="caption">Importing…</Typography>
        </Box>
      )}
    </ImageListItem>
  );
}
