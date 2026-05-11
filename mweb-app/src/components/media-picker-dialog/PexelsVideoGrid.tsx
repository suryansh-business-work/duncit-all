import {
  Alert,
  Box,
  CircularProgress,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Typography,
} from '@mui/material';
import { pickBestVideoFile } from './videoHelpers';

interface PexelsVideoGridProps {
  videos: any[];
  searching: boolean;
  importingId: string | null;
  onImport: (video: any) => void;
}

export default function PexelsVideoGrid({
  videos,
  searching,
  importingId,
  onImport,
}: PexelsVideoGridProps) {
  if (searching && videos.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (videos.length === 0) {
    return <Alert severity="info">No videos — try a different query.</Alert>;
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
      rowHeight={160}
    >
      {videos.map((v: any) => {
        const isImporting = importingId === v.id;
        const best = pickBestVideoFile(v);
        return (
          <ImageListItem
            key={v.id}
            sx={{
              cursor: 'pointer',
              borderRadius: 1,
              overflow: 'hidden',
              opacity: importingId && !isImporting ? 0.5 : 1,
              position: 'relative',
            }}
            onClick={() => !importingId && onImport(v)}
          >
            {best?.link ? (
              <video
                src={best.link}
                poster={v.image}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  background: '#000',
                }}
              />
            ) : (
              <img
                src={v.preview || v.image}
                alt={v.user_name}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  background: '#000',
                }}
              />
            )}
            <ImageListItemBar
              title={v.user_name || 'Pexels'}
              subtitle={`${v.duration}s · ${v.width}×${v.height}`}
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
