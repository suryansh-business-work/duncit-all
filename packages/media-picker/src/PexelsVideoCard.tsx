import { Box, CircularProgress, ImageListItem, ImageListItemBar, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from './i18n/useTranslation';
import { pickBestVideoFile } from './utils';

interface Props {
  video: any;
  importing: boolean;
  anyImporting: boolean;
  onPick: (video: any) => void;
}

export default function PexelsVideoCard({
  video,
  importing,
  anyImporting,
  onPick,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const best = pickBestVideoFile(video);
  return (
    <ImageListItem
      sx={{
        cursor: 'pointer',
        borderRadius: 1,
        overflow: 'hidden',
        opacity: anyImporting && !importing ? 0.5 : 1,
        position: 'relative',
      }}
      onClick={() => !anyImporting && onPick(video)}
    >
      {best?.link ? (
        <video
          src={best.link}
          poster={video.image}
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
          src={video.preview || video.image}
          alt={video.user_name}
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
        title={video.user_name || 'Pexels'}
        subtitle={`${video.duration}s · ${video.width}×${video.height}`}
        sx={{ background: (theme) => `linear-gradient(${alpha(theme.palette.common.black, 0.6)}, transparent)` }}
      />
      {importing && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: (theme) => alpha(theme.palette.common.black, 0.5),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: (theme) => theme.palette.common.white,
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <CircularProgress size={28} sx={{ color: (theme) => theme.palette.common.white }} />
          <Typography variant="caption">{t('media.pexels.importing')}</Typography>
        </Box>
      )}
    </ImageListItem>
  );
}
