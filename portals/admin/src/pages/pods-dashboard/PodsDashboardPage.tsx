import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Grid, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { POD_DASHBOARD, WINDOW_OPTIONS, type DashboardPod } from './queries';
import PodDashboardTiles from './PodDashboardTiles';
import PodRatingsCard from './PodRatingsCard';
import PodListCard from './PodListCard';
import PodTrendChart from './PodTrendChart';

/**
 * Pods > Dashboard — how pods are doing, in one screen.
 *
 * The counts at the top are live; the money, the ratings and the trend cover
 * the window chosen here, because "collected ₹4L" only means something with a
 * period attached to it.
 */
export default function PodsDashboardPage() {
  const [days, setDays] = useState(30);
  const { data, loading, error } = useQuery(POD_DASHBOARD, {
    variables: { days },
    fetchPolicy: 'cache-and-network',
  });

  const board = data?.podDashboard;
  const topRated: DashboardPod[] = board?.top_rated ?? [];
  const needsAttention: DashboardPod[] = board?.needs_attention ?? [];
  const upcoming: DashboardPod[] = board?.upcoming ?? [];

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Pods dashboard"
        subtitle="Counts are live. Money, ratings and the trend cover the selected period."
        actions={
          <ToggleButtonGroup
            size="small"
            exclusive
            value={days}
            onChange={(_event, next) => next && setDays(next)}
            aria-label="Reporting period"
          >
            {WINDOW_OPTIONS.map((option) => (
              <ToggleButton key={option.days} value={option.days}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        }
      />

      {error && <Alert severity="error">{error.message}</Alert>}

      <PodDashboardTiles
        totals={board?.totals ?? null}
        seats={board?.seats ?? null}
        money={board?.money ?? null}
        ratings={board?.ratings ?? null}
        loading={loading}
      />

      <PodTrendChart trend={board?.created_trend ?? []} loading={loading} />

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <PodRatingsCard
            aspects={board?.ratings?.aspects ?? []}
            total={board?.ratings?.total ?? 0}
            days={board?.days ?? days}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <PodListCard
            title="Best rated"
            subtitle="Highest scoring pods, all time"
            pods={topRated}
            emptyText="No pod has been rated yet."
            showRating
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <PodListCard
            title="Needs attention"
            subtitle="Rated below four — look at these first"
            pods={needsAttention}
            emptyText="Nothing is scoring badly."
            showRating
          />
        </Grid>
        <Grid item xs={12}>
          <PodListCard
            title="Starting next"
            subtitle="The pods coming up, with seats sold"
            pods={upcoming}
            emptyText="No upcoming pods."
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
