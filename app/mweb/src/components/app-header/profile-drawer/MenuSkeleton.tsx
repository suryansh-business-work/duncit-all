import { Box, Paper, Skeleton, Stack } from '@mui/material';

/** Rows a placeholder Manage-Account group stands in for. */
const LIST_ROWS = ['a', 'b', 'c'];
/** The four quick-action tiles the grid always renders. */
const GRID_TILES = ['a', 'b', 'c', 'd'];

function TileSkeleton() {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '16px' }}>
      <Skeleton variant="rounded" width={36} height={36} sx={{ mb: 1 }} />
      <Skeleton width="70%" height={20} />
      <Skeleton width="45%" height={14} />
    </Paper>
  );
}

function CardSkeleton() {
  return (
    <Box sx={{ px: 2, pb: 1.25 }}>
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '16px' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Skeleton variant="rounded" width={44} height={44} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton width="45%" height={22} />
            <Skeleton width="65%" height={16} />
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

function ListSkeleton() {
  return (
    <Box sx={{ px: 2, pb: 1.25 }}>
      <Skeleton width="35%" height={18} sx={{ mb: 1 }} />
      <Paper variant="outlined" sx={{ borderRadius: '16px', px: 1.75, py: 0.5 }}>
        {LIST_ROWS.map((row) => (
          <Stack key={row} direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1.1 }}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton width="55%" height={18} />
          </Stack>
        ))}
      </Paper>
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
      <Box sx={{ px: 2, py: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 1.5, py: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton width="55%" height={24} />
            <Skeleton width="70%" height={16} />
          </Box>
          <Skeleton variant="circular" width={44} height={44} />
        </Stack>
      </Box>

      <Box
        sx={{
          px: 2,
          pb: 1.25,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1.25,
        }}
      >
        {GRID_TILES.map((tile) => (
          <TileSkeleton key={tile} />
        ))}
      </Box>

      <Box sx={{ px: 2, pb: 1.25 }}>
        <Skeleton variant="rectangular" height={132} sx={{ borderRadius: '16px' }} />
      </Box>

      <CardSkeleton />
      <CardSkeleton />
      <ListSkeleton />
      <ListSkeleton />
    </Box>
  );
}
