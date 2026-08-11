import { useQuery } from '@apollo/client';
import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { ADMIN_LEADERBOARD_STATS, type LeaderboardCategoryStats } from './queries';
import { CATEGORY_LABEL_KEYS, type TranslateFn } from './labels';

/** The three stat lines every card renders, in display order. */
const STAT_LINES = [
  { field: 'total_points', labelKey: 'admin.leaderboard.statTotalPoints' },
  { field: 'awards_count', labelKey: 'admin.leaderboard.statAwards' },
  { field: 'participants', labelKey: 'admin.leaderboard.statParticipants' },
] as const;

interface StatCardProps {
  stat: LeaderboardCategoryStats;
  t: TranslateFn;
}

function StatCard({ stat, t }: Readonly<StatCardProps>) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {t(CATEGORY_LABEL_KEYS[stat.category])}
      </Typography>
      <Stack spacing={0.5}>
        {STAT_LINES.map((line) => (
          <Stack key={line.field} direction="row" justifyContent="space-between" spacing={2}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {t(line.labelKey)}
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {stat[line.field].toLocaleString()}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

/** One headline card per board, straight from leaderboardAdminStats. */
export default function BoardStatsCards() {
  const { t } = useTranslation();
  const { data, error } = useQuery(ADMIN_LEADERBOARD_STATS, { fetchPolicy: 'cache-and-network' });
  const stats: LeaderboardCategoryStats[] = data?.leaderboardAdminStats ?? [];

  if (error) {
    return <Alert severity="error">{t('admin.leaderboard.boardError')}</Alert>;
  }
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(5, 1fr)',
        },
      }}
    >
      {stats.map((stat) => (
        <StatCard key={stat.category} stat={stat} t={t} />
      ))}
    </Box>
  );
}
