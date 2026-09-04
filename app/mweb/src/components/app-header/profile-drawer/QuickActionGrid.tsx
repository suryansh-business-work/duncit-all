import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { profileIcon } from './profileIcons';
import { type ProfileTile } from './profileSections';

/** Which grid tiles the Profile tour walks through. Keyed off the tile, so a
 * reordered grid cannot point a step at the wrong destination. Native twin:
 * app/mobile-app/src/components/Sidebar/SidebarQuickGrid.tsx. */
const TOUR_ANCHORS: Readonly<Record<string, string>> = {
  'pod-history': 'profile-history',
  earn: 'profile-earn',
};

function ActionTile({ tile, onNavigate }: Readonly<{ tile: ProfileTile; onNavigate: (to: string) => void }>) {
  return (
    <Paper
      variant="outlined"
      data-tour={TOUR_ANCHORS[tile.key]}
      onClick={() => onNavigate(tile.to)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onNavigate(tile.to);
      }}
      sx={{
        p: 1.5,
        borderRadius: '16px',
        cursor: 'pointer',
        transition: 'border-color 160ms ease, background-color 160ms ease',
        '&:hover': { borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.05) },
      }}
      aria-label={tile.label}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '8px',
          display: 'grid',
          placeItems: 'center',
          color: 'primary.main',
          bgcolor: (t) => alpha(t.palette.primary.main, 0.14),
          mb: 1,
        }}
      >
        {profileIcon(tile.icon)}
      </Box>
      <Typography
        noWrap
        sx={{
          fontSize: 14,
          fontWeight: 600
        }}>
        {tile.label}
      </Typography>
      <Typography
        noWrap
        sx={{
          fontSize: 11.5,
          color: "text.secondary",
          display: "block"
        }}>
        {tile.caption}
      </Typography>
    </Paper>
  );
}

interface Props {
  /** The tiles to draw, in order. Composed by the caller because two of them
   * (Chats, Following) carry translated copy and the config module holds none. */
  tiles: readonly ProfileTile[];
  onNavigate: (to: string) => void;
}

export default function QuickActionGrid({ tiles, onNavigate }: Readonly<Props>) {
  return (
    <Box sx={{ px: 2, pb: 1.25 }}>
      <Stack
        direction="row"
        sx={{
          flexWrap: "wrap",
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1.25
        }}>
        {tiles.map((tile) => (
          <ActionTile key={tile.key} tile={tile} onNavigate={onNavigate} />
        ))}
      </Stack>
    </Box>
  );
}
