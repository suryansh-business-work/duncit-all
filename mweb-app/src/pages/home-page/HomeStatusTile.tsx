import { Avatar, Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';

interface HomeStatusTileProps {
  label: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  initials?: string;
  add?: boolean;
  active?: boolean;
  onClick: () => void;
}

export default function HomeStatusTile({
  label,
  imageUrl,
  videoUrl,
  initials,
  add = false,
  active = true,
  onClick,
}: HomeStatusTileProps) {
  const theme = useTheme();
  const ring = active
    ? 'linear-gradient(135deg, #ff4f73 0%, #ff8a3d 42%, #13d6b3 72%, #7c5cff 100%)'
    : `linear-gradient(135deg, ${alpha(theme.palette.text.primary, 0.28)}, ${alpha(theme.palette.text.primary, 0.1)})`;

  return (
    <Stack
      component="button"
      type="button"
      onClick={onClick}
      spacing={0.6}
      alignItems="center"
      sx={{
        width: 70,
        minHeight: 90,
        flex: '0 0 auto',
        p: 0,
        border: 0,
        bgcolor: 'transparent',
        color: 'text.primary',
        cursor: 'pointer',
        font: 'inherit',
        touchAction: 'manipulation',
        overflow: 'visible',
      }}
    >
      <Box
        sx={{
          width: 62,
          height: 62,
          borderRadius: '50%',
          p: add ? 1.5 : 0.35,
          background: add ? 'transparent' : ring,
          border: add ? 1.5 : 0,
          borderStyle: add ? 'dashed' : 'solid',
          borderColor: 'divider',
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            overflow: 'hidden',
            bgcolor: add ? 'action.hover' : 'background.paper',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {videoUrl ? (
            <Box component="video" src={videoUrl} autoPlay muted loop playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : imageUrl ? (
            <Box component="img" src={imageUrl} alt={label} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Avatar sx={{ width: '100%', height: '100%', bgcolor: 'primary.main', fontWeight: 900 }}>
              {initials || label.slice(0, 1).toUpperCase()}
            </Avatar>
          )}
        </Box>
        {add && (
          <Box
            sx={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 22,
              height: 22,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              border: 2,
              borderColor: 'background.paper',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </Box>
        )}
      </Box>
      <Typography
        variant="caption"
        sx={{
          width: '100%',
          minHeight: 17,
          fontWeight: 800,
          lineHeight: 1.15,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}