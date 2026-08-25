import { Stack, Typography } from '@mui/material';
import { EM_DASH, dateColumn, type DuncitColumn } from '@duncit/table';
import type { DateFormatter } from '@duncit/app-settings';
import type { LeaderboardPointRow } from './queries';
import { CATEGORIES, CATEGORY_LABEL_KEYS, SOURCE_TYPES, type TranslateFn } from './labels';

const renderUser = (row: LeaderboardPointRow) => (
  <Stack sx={{ minWidth: 0 }}>
    <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
      {row.user_name || row.user_id}
    </Typography>
    <Typography variant="caption" noWrap sx={{
      color: "text.secondary"
    }}>
      {row.user_email || EM_DASH}
    </Typography>
  </Stack>
);

/**
 * Ledger columns. Sortable columns match the server's allowlist (created_at,
 * points, category, source_type); the joined user and pod fields are resolved
 * after the page is fetched, so offering a sort there would be silently
 * dropped.
 */
export function buildLeaderboardPointsColumns(
  t: TranslateFn,
  formatDateTime: DateFormatter['formatDateTime'],
): DuncitColumn<LeaderboardPointRow>[] {
  return [
    dateColumn<LeaderboardPointRow>({
      field: 'created_at',
      headerName: t('admin.leaderboard.colDate'),
      minWidth: 190,
      hide: false,
      formatDate: formatDateTime,
    }),
    {
      field: 'category',
      headerName: t('admin.leaderboard.rewardCategory'),
      minWidth: 150,
      filter: {
        type: 'select',
        options: CATEGORIES.map((value) => ({ value, label: t(CATEGORY_LABEL_KEYS[value]) })),
      },
      valueGetter: (row) => t(CATEGORY_LABEL_KEYS[row.category]),
    },
    {
      field: 'user_name',
      headerName: t('admin.leaderboard.colUser'),
      sortable: false,
      flex: 1,
      minWidth: 190,
      cellRenderer: renderUser,
      valueGetter: (row) => row.user_name || row.user_id,
    },
    {
      field: 'points',
      headerName: t('admin.leaderboard.colPoints'),
      minWidth: 110,
      filter: { type: 'number' },
      valueGetter: (row) => row.points,
    },
    {
      field: 'source_type',
      headerName: t('admin.leaderboard.colAction'),
      minWidth: 190,
      filter: {
        type: 'select',
        options: SOURCE_TYPES.map((value) => ({ value, label: value })),
      },
      valueGetter: (row) => row.source_type,
    },
    {
      field: 'source_id',
      headerName: t('admin.leaderboard.colSource'),
      sortable: false,
      minWidth: 180,
      valueGetter: (row) => row.source_id || EM_DASH,
    },
    {
      field: 'pod_title',
      headerName: t('admin.leaderboard.colPod'),
      sortable: false,
      flex: 1,
      minWidth: 190,
      valueGetter: (row) => row.pod_title || EM_DASH,
    },
  ];
}
