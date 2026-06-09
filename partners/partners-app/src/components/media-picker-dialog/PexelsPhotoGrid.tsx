import {
  Alert,
  Box,
  CircularProgress,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Typography,
} from '@mui/material';

interface PexelsPhotoGridProps {
  photos: any[];
  searching: boolean;
  importingId: string | null;
  onImport: (photo: any) => void;
}

export default function PexelsPhotoGrid({
  photos,
  searching,
  importingId,
  onImport,
}: Readonly<PexelsPhotoGridProps>) {
  if (searching && photos.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (photos.length === 0) {
    return <Alert severity="info">No results — try a different query.</Alert>;
  }
  return (
    <ImageList
      cols={2}
      sx={{
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr) !important',
          sm: 'repeat(3, 1fr) !important',
        },
      }}
      gap={8}
      rowHeight={140}
    >
      {photos.map((p: any) => {
        const isImporting = importingId === p.id;
        return (
          <ImageListItem
            key={p.id}
            sx={{
              cursor: 'pointer',
              borderRadius: 1,
              overflow: 'hidden',
              opacity: importingId && !isImporting ? 0.5 : 1,
              position: 'relative',
              '&:hover img': { transform: 'scale(1.04)' },
            }}
            onClick={() => !importingId && onImport(p)}
          >
            <img
              src={p.src_medium}
              alt={p.alt || p.photographer}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform .2s ease',
                background: p.avg_color || '#eee',
              }}
            />
            <ImageListItemBar
              title={p.photographer}
              subtitle="Pexels"
              sx={{ background: 'linear-gradient(rgba(0,0,0,.6), transparent)' }}
            />
            {isImporting && (
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
      })}
    </ImageList>
  );
}
