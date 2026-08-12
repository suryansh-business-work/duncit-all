import { useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  LEADERBOARD_CATEGORIES,
  LEADERBOARD_PERIODS,
  LEADERBOARD_PERIOD_KEY,
  LEADERBOARD_TAB_KEY,
  type LeaderboardCategory,
  type LeaderboardPeriodKey,
} from '@duncit/utils';
import YourPointsCard from './YourPointsCard';
import LeaderboardList from './LeaderboardList';
import HowToEarnCard from './HowToEarnCard';
import RewardsCard from './RewardsCard';
import {
  LEADERBOARD_BOARD,
  LEADERBOARD_CONFIG,
  type LeaderboardBoardData,
  type LeaderboardConfigData,
} from './queries';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * The Leaderboard — five boards (Users, Hosts, Club Admins, Venues, Brands),
 * a period toggle, the caller's own standing up top, then how points are
 * earned and what finishing well pays. Twin of the native LeaderboardScreen
 * (rule 27); the section is reached only through the flag-gated sidebar row.
 */
export default function LeaderboardPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<LeaderboardCategory>('USER');
  const [period, setPeriod] = useState<LeaderboardPeriodKey>('MONTH');

  const { data, loading, error } = useQuery<{ leaderboard: LeaderboardBoardData }>(
    LEADERBOARD_BOARD,
    { variables: { category, period }, fetchPolicy: 'cache-and-network' }
  );
  const { data: configData, loading: configLoading } = useQuery<{
    leaderboardConfig: LeaderboardConfigData;
  }>(LEADERBOARD_CONFIG, { fetchPolicy: 'cache-first' });

  const board = data?.leaderboard ?? null;
  const config = configData?.leaderboardConfig ?? null;

  const spinner = (
    <Stack alignItems="center" sx={{ py: 4 }}>
      <CircularProgress size={24} />
    </Stack>
  );

  let configSection: ReactNode = null;
  if (configLoading && !config) {
    configSection = spinner;
  } else if (config) {
    configSection = (
      <>
        <HowToEarnCard config={config} />
        <RewardsCard config={config} category={category} />
      </>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
        <Typography variant="h6" fontWeight={700}>
          {t('mweb.leaderboard.title')}
        </Typography>

        <Tabs
          value={category}
          onChange={(_e, next: LeaderboardCategory) => setCategory(next)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          {LEADERBOARD_CATEGORIES.map((cat) => (
            <Tab key={cat} value={cat} label={t(LEADERBOARD_TAB_KEY[cat])} />
          ))}
        </Tabs>

        <YourPointsCard board={board} loading={loading} />

        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={period}
          onChange={(_e, next: LeaderboardPeriodKey | null) => next && setPeriod(next)}
        >
          {LEADERBOARD_PERIODS.map((p) => (
            <ToggleButton key={p} value={p}>
              {t(LEADERBOARD_PERIOD_KEY[p])}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {error && <Alert severity="error">{t('mweb.leaderboard.loadError')}</Alert>}

        {loading && !data ? spinner : <LeaderboardList rows={board?.rows ?? []} />}

        {configSection}
      </Stack>
    </Box>
  );
}
