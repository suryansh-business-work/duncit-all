import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
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
 *
 * Each section is a widget of the shared dashboard grid, so the arrangement is
 * whatever the person reading it wants. The cards below already carry their own
 * surface and heading, so they render `bare` — the widget adds only the drag
 * grip, not a second frame.
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

  const widgets = useMemo<DashboardWidget[]>(
    () => [
      {
        id: 'tiles',
        bare: true,
        // Ten tiles wrap with the viewport — a fixed row count cuts them off.
        fitContent: true,
        defaultLayout: { x: 0, y: 0, w: 12, h: 3 },
        minH: 2,
        content: (
          <PodDashboardTiles
            totals={board?.totals ?? null}
            seats={board?.seats ?? null}
            money={board?.money ?? null}
            ratings={board?.ratings ?? null}
            loading={loading}
          />
        ),
      },
      {
        id: 'trend',
        bare: true,
        defaultLayout: { x: 0, y: 3, w: 12, h: 5 },
        minW: 4,
        minH: 4,
        content: <PodTrendChart trend={board?.created_trend ?? []} loading={loading} />,
      },
      {
        id: 'ratings',
        bare: true,
        fitContent: true,
        defaultLayout: { x: 0, y: 8, w: 4, h: 6 },
        minW: 3,
        // minH floors the measured height — keep it low or empty states pin a void.
        minH: 2,
        content: (
          <PodRatingsCard
            aspects={board?.ratings?.aspects ?? []}
            total={board?.ratings?.total ?? 0}
            days={board?.days ?? days}
          />
        ),
      },
      {
        id: 'best-rated',
        bare: true,
        fitContent: true,
        defaultLayout: { x: 4, y: 8, w: 4, h: 6 },
        minW: 3,
        minH: 2,
        content: (
          <PodListCard
            title="Best rated"
            subtitle="Highest scoring pods, all time"
            pods={topRated}
            emptyText="No pod has been rated yet."
            showRating
          />
        ),
      },
      {
        id: 'needs-attention',
        bare: true,
        fitContent: true,
        defaultLayout: { x: 8, y: 8, w: 4, h: 6 },
        minW: 3,
        minH: 2,
        content: (
          <PodListCard
            title="Needs attention"
            subtitle="Rated below four — look at these first"
            pods={needsAttention}
            emptyText="Nothing is scoring badly."
            showRating
          />
        ),
      },
      {
        id: 'starting-next',
        bare: true,
        fitContent: true,
        defaultLayout: { x: 0, y: 14, w: 12, h: 6 },
        minW: 4,
        minH: 2,
        content: (
          <PodListCard
            title="Starting next"
            subtitle="The pods coming up, with seats sold"
            pods={upcoming}
            emptyText="No upcoming pods."
          />
        ),
      },
    ],
    [board, loading, days, topRated, needsAttention, upcoming],
  );

  return (
    <DuncitDashboard
      dashboardId="admin.pods"
      header={
        <>
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
        </>
      }
      widgets={widgets}
    />
  );
}
