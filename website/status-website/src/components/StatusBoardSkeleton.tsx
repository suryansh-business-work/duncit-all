import { Box, Paper, Skeleton, Stack } from '@mui/material';
import { useTranslation } from '../i18n';

/**
 * The loading state of the board, shaped like the board.
 *
 * Three grey rectangles used to stand in for the whole page, so the layout
 * jumped the moment the data landed and nothing said which part was still
 * coming. These placeholders occupy the same boxes the real banner, chart,
 * filters and service rows do, so the arriving data fills them instead of
 * shoving them aside.
 */
const GROUPS = ['consoles', 'platform', 'websites'];
const ROWS = ['first', 'second', 'third', 'fourth'];

function BannerSkeleton() {
  return (
    <Paper variant="outlined" sx={{ px: 2.5, py: 1.75, mb: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1 }}>
          <Skeleton variant="circular" width={12} height={12} />
          <Skeleton variant="text" width="45%" height={24} />
        </Stack>
        <Skeleton variant="text" width={120} />
      </Stack>
    </Paper>
  );
}

function ChartSkeleton() {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
        <Skeleton variant="text" width={200} />
        <Skeleton variant="text" width={70} height={30} />
      </Stack>
      <Skeleton variant="rounded" height={120} sx={{ mt: 1 }} />
    </Paper>
  );
}

function FiltersSkeleton() {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      mb={3}
    >
      <Skeleton variant="rounded" height={40} sx={{ flex: 1 }} />
      <Skeleton variant="rounded" height={40} width={140} />
      <Skeleton variant="rounded" height={40} width={210} />
    </Stack>
  );
}

function ServiceRowSkeleton({ divider }: Readonly<{ divider: boolean }>) {
  return (
    <Box sx={{ px: 2, py: 1.5, ...(divider ? { borderBottom: 1, borderColor: 'divider' } : {}) }}>
      <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: '1 1 220px' }}>
          <Skeleton variant="circular" width={10} height={10} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="65%" height={16} />
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.75}>
          <Skeleton variant="rounded" width={86} height={24} />
          <Skeleton variant="rounded" width={86} height={24} />
          <Skeleton variant="rounded" width={92} height={24} />
        </Stack>
      </Stack>
      <Skeleton variant="rounded" height={26} sx={{ mt: 1.25 }} />
    </Box>
  );
}

function GroupSkeleton() {
  return (
    <Box component="section" mb={4}>
      <Skeleton variant="text" width={120} height={18} />
      <Paper variant="outlined" sx={{ mt: 0.5, overflow: 'hidden' }}>
        {ROWS.map((row, index) => (
          <ServiceRowSkeleton key={row} divider={index < ROWS.length - 1} />
        ))}
      </Paper>
    </Box>
  );
}

export default function StatusBoardSkeleton() {
  const { t } = useTranslation();
  return (
    <Box aria-busy="true" aria-label={t('status.loading.board')} role="status">
      <BannerSkeleton />
      <ChartSkeleton />
      <FiltersSkeleton />
      {GROUPS.map((group) => (
        <GroupSkeleton key={group} />
      ))}
    </Box>
  );
}
