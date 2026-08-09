import { Box, CircularProgress, ImageListItem, ImageListItemBar, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from './i18n/useTranslation';
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
  const { t } = useTranslation();
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
            bgcolor: (theme) => theme.palette.common.white,
            borderRadius: '50%',
          }}
        />
      )}
      <ImageListItemBar
        title={photo.photographer}
        subtitle={t('media.pexels.credit')}
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
