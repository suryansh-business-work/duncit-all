import { Box, ButtonBase } from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

interface Props {
  url: string;
  type?: string | null;
  size?: number | string;
  aspect?: string;
  index: number;
  total: number;
  onClick: () => void;
}

export default function MomentTile({ url, type, size, aspect, index, total, onClick }: Readonly<Props>) {
  return (
    <ButtonBase
      onClick={onClick}
      focusRipple
      aria-label={`Open moment ${index + 1} of ${total}`}
      sx={{
        position: 'relative',
        flex: '0 0 auto',
        width: size ?? '100%',
        height: size,
        aspectRatio: aspect,
        borderRadius: 1.5,
        overflow: 'hidden',
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      {type === 'VIDEO' ? (
        <>
          <Box
            component="video"
            src={url}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.25)',
              color: 'common.white',
            }}
          >
            <PlayCircleOutlineIcon fontSize="large" />
          </Box>
        </>
      ) : (
        <Box
          component="img"
          src={url}
          alt=""
          loading="lazy"
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </ButtonBase>
  );
}
