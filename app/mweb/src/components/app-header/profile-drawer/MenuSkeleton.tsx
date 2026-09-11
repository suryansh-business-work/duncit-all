import { Box, Skeleton, Stack } from '@mui/material';
import { SURFACE_SX } from '../../../theme';

/** Rows a placeholder Manage-Account group stands in for. */
const LIST_ROWS = ['a', 'b', 'c'];
/** The four quick-action tiles the grid always renders. */
const GRID_TILES = ['a', 'b', 'c', 'd'];

function TileSkeleton() {
  return (
    <Stack spacing={1.25} sx={{ ...SURFACE_SX, borderRadius: '16px', p: 1.75 }}>
      <Skeleton variant="circular" width={36} height={36} />
      <Skeleton width="70%" height={20} />
    </Stack>
  );
}

function CardSkeleton() {
  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <Stack direction="row" spacing={1.5} sx={{ ...SURFACE_SX, p: 2, alignItems: 'center' }}>
        <Skeleton variant="circular" width={44} height={44} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton width="45%" height={22} />
          <Skeleton width="65%" height={16} />
        </Box>
      </Stack>
    </Box>
  );
}

function ListSkeleton() {
  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <Skeleton width="35%" height={24} sx={{ mb: 1 }} />
      <Box sx={{ ...SURFACE_SX, px: 2 }}>
        {LIST_ROWS.map((row) => (
          <Stack key={row} direction="row" spacing={1.5} sx={{ alignItems: 'center', minHeight: 60 }}>
            <Skeleton variant="circular" width={36} height={36} />
            <Skeleton width="55%" height={18} />
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

/**
 * The menu's shape while the account query is still in flight — the twin of
 * native's <SidebarSkeleton/>. It stands in for the whole body rather than a
 * spinner so the panel does not paint a stranger's menu for a beat: an
 * anonymous "User" avatar sitting at 0% profile completion.
 */
export default function MenuSkeleton() {
  return (
    <Box data-testid="menu-skeleton">
      <Box sx={{ px: 2, pb: 1.5 }}>
        <Stack direction="row" spacing={1.75} sx={{ ...SURFACE_SX, p: 2, alignItems: 'center' }}>
          <Skeleton variant="circular" width={52} height={52} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton width="55%" height={26} />
            <Skeleton width="70%" height={16} />
          </Box>
        </Stack>
      </Box>

      <Box
        sx={{
          px: 2,
          pb: 1.5,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1.5,
        }}
      >
        {GRID_TILES.map((tile) => (
          <TileSkeleton key={tile} />
        ))}
      </Box>

      <Box sx={{ px: 2, pb: 1.5 }}>
        <Skeleton variant="rectangular" height={132} sx={{ borderRadius: '16px' }} />
      </Box>

      <CardSkeleton />
      <CardSkeleton />
      <ListSkeleton />
      <ListSkeleton />
    </Box>
  );
}
