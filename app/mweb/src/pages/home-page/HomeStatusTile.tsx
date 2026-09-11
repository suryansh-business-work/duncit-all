import { Avatar, Box, Stack, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';

/** The "unseen story" ring shared by every story rail (home + club): a solid
 * accent, read from the theme so it flips with the mode. A theme callback, so
 * it works as an `sx` `background` value; the name is kept for its importers. */
export const STORY_RING_GRADIENT = (theme: Theme) => theme.palette.secondary.main;

/** Ring, then a 2px surface gap, around the avatar: accent when unseen, a
 * hairline once seen, a dashed outline on the "add" tile. Both rings are 2.5px
 * deep in total so a tile never changes size when it is seen. */
function ringSx(add: boolean, active: boolean) {
  if (add) return { p: 1.5, border: '1.5px dashed', borderColor: 'divider' };
  if (active) return { p: '2.5px', background: STORY_RING_GRADIENT };
  return { p: '1.5px', border: '1px solid', borderColor: 'divider' };
}

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
}: Readonly<HomeStatusTileProps>) {
  // Unseen tiles get the accent ring; seen tiles keep a hairline ring so they
  // stay recognisable as stories — they also shift to the end of the rail.
  const imageOrAvatar = imageUrl ? (
    <Box component="img" src={imageUrl} alt={label} loading="lazy" decoding="async" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <Avatar sx={{ width: '100%', height: '100%', bgcolor: 'text.secondary', color: 'common.white', fontWeight: 600 }}>
      {initials || label.slice(0, 1).toUpperCase()}
    </Avatar>
  );

  return (
    <Stack
      component="button"
      type="button"
      onClick={onClick}
      spacing={0.6}
      sx={{
        alignItems: "center",
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
        overflow: 'visible'
      }}>
      <Box
        sx={{
          width: 62,
          height: 62,
          borderRadius: '50%',
          ...ringSx(add, active),
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
            border: add ? 0 : '2px solid',
            borderColor: 'background.paper',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {videoUrl ? (
            <Box component="video" src={videoUrl} autoPlay muted loop playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            imageOrAvatar
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
          fontWeight: 600,
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