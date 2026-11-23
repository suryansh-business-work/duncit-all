import { useQuery } from '@apollo/client/react';
import { Alert, Box, Skeleton, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { formatMonthKey } from '@duncit/utils';
import { logs } from '@duncit/logs';
import { TARGETS_DASHBOARD, type TargetsDashboardResult } from '../../lib/dashboard-queries';
import DashboardStats from './DashboardStats';
import ReviewQueueCard from './ReviewQueueCard';
import LatestPlanCard from './LatestPlanCard';

const TWO_COLUMNS = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' } } as const;

function OverviewSkeleton() {
  return (
    <Stack spacing={2} data-testid="targets-dashboard-loading">
      <Skeleton variant="text" width={220} />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' } }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" height={96} />
        ))}
      </Box>
      <Box sx={TWO_COLUMNS}>
        <Skeleton variant="rounded" height={220} />
        <Skeleton variant="rounded" height={220} />
      </Box>
    </Stack>
  );
}

/**
 * Where the console's targets stand: this month's employee targets, the
 * reports waiting for a review, and the newest saved growth plan — all from
 * one server read, so the numbers always agree with each other.
 */
export default function TargetsOverview() {
  const { t, locale } = useTranslation();
  const { data, loading, error, refetch } = useQuery<TargetsDashboardResult>(TARGETS_DASHBOARD, {
    fetchPolicy: 'cache-and-network',
  });
  const board = data?.targetsDashboard;

  if (!board && (loading || !error)) return <OverviewSkeleton />;
  if (!board) {
    const retry = () => {
      refetch().catch((retryError: unknown) => logs.portal.targets.warn('TargetsOverview', 'retry', { error: retryError }));
    };
    return (
      <Alert
        severity="error"
        data-testid="targets-dashboard-error"
        action={
          <DuncitButton color="inherit" size="small" onClick={retry} data-testid="targets-dashboard-retry">
            {t('targets.dashboard.retry')}
          </DuncitButton>
        }
      >
        {t('targets.dashboard.loadFailed')}
      </Alert>
    );
  }

  return (
    <Stack spacing={2} data-testid="targets-dashboard">
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
        {t('targets.dashboard.monthHeading', { vars: { month: formatMonthKey(board.month, locale) } })}
      </Typography>
      <DashboardStats board={board} />
      <Box sx={TWO_COLUMNS}>
        <ReviewQueueCard rows={board.review_queue} total={board.awaiting_review} />
        <LatestPlanCard plan={board.latest_calculation} />
      </Box>
    </Stack>
  );
}
