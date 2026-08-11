import { useQuery } from '@apollo/client';
import { Alert, Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from '@duncit/app-settings';
import { QueryGuard } from '@duncit/ui';
import PointsPerActionCard from './PointsPerActionCard';
import RewardsEditor from './RewardsEditor';
import { ADMIN_LEADERBOARD_SETTINGS, type LeaderboardSettings } from './queries';

/** Admin > Leaderboard > Settings & Rewards — what each action earns and what
 * finishing a window inside a rank range pays. Each card has its own Save. */
export default function LeaderboardSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(ADMIN_LEADERBOARD_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const settings: LeaderboardSettings | undefined = data?.leaderboardSettings;

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <TuneIcon color="primary" />
        <Stack>
          <Typography variant="h5" fontWeight={700}>
            {t('admin.leaderboard.settingsTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('admin.leaderboard.settingsSubtitle')}
          </Typography>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{t('admin.leaderboard.loadError')}</Alert>}
      {loading && !settings && <QueryGuard loading spinnerSx={{ p: 6 }} />}

      {settings && (
        <>
          <PointsPerActionCard settings={settings} />
          <RewardsEditor savedRewards={settings.rewards} />
        </>
      )}
    </Stack>
  );
}
