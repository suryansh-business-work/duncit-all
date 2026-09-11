import { Box, Typography } from '@mui/material';
import { SURFACE_SX } from '../../../theme';
import { profileIcon } from './profileIcons';
import { type ProfileTile } from './profileSections';

/** Which grid tiles the Profile tour walks through. Keyed off the tile, so a
 * reordered grid cannot point a step at the wrong destination. Native twin:
 * app/mobile-app/src/components/Sidebar/SidebarQuickGrid.tsx. */
const TOUR_ANCHORS: Readonly<Record<string, string>> = {
  'pod-history': 'profile-history',
  earn: 'profile-earn',
};

/** One quick-action tile: an accent icon on a soft disc and the label. The
 * label says where it goes, so the tile carries no caption. */
function ActionTile({ tile, onNavigate }: Readonly<{ tile: ProfileTile; onNavigate: (to: string) => void }>) {
  return (
    <Box
      data-tour={TOUR_ANCHORS[tile.key]}
      onClick={() => onNavigate(tile.to)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onNavigate(tile.to);
      }}
      sx={{
        ...SURFACE_SX,
        borderRadius: '16px',
        p: 1.75,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        minWidth: 0,
        transition: 'border-color 160ms ease',
        '&:hover': { borderColor: 'divider' },
      }}
      aria-label={tile.label}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: 'secondary.main',
          bgcolor: 'action.hover',
          '& svg': { fontSize: 20 },
        }}
      >
        {profileIcon(tile.icon)}
      </Box>
      <Typography noWrap sx={{ fontSize: 14, fontWeight: 600 }}>
        {tile.label}
      </Typography>
    </Box>
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
    <Box sx={{ px: 2, pb: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
      {tiles.map((tile) => (
        <ActionTile key={tile.key} tile={tile} onNavigate={onNavigate} />
      ))}
    </Box>
  );
}
