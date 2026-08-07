import { Box, CircularProgress, ImageListItem, ImageListItemBar, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface Props {
  photo: any;
  importing: boolean;
  /** Already in the tray — shown ticked so the grid says what was chosen. */
  picked?: boolean;
  anyImporting: boolean;
  onPick: (photo: any) => void;
}

export default function PexelsPhotoCard({
  photo,
  importing,
  picked,
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
        outline: picked ? '3px solid' : 'none',
        outlineColor: 'primary.main',
        outlineOffset: '-3px',
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
      {picked && (
        <CheckCircleIcon
          color="primary"
          sx={{
            position: 'absolute',
            right: 6,
            top: 6,
            fontSize: 22,
            bgcolor: '#fff',
            borderRadius: '50%',
          }}
        />
      )}
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
