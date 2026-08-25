import { useMemo, useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import KpiCards from './KpiCards';
import RangeFilter from './RangeFilter';
import StageChart from './StageChart';
import PriorityChart from './PriorityChart';
import ServicesChart from './ServicesChart';
import SuperCategoryChart from './SuperCategoryChart';
import { rangeToWindow, type DashboardRange, type DateWindow } from './dashboardConfig';
import { useDashboardData } from './useDashboardData';
import { parseApiError } from '@duncit/utils';

export default function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>('month');
  const [custom, setCustom] = useState<DateWindow>({});

  const window = useMemo(() => rangeToWindow(range, custom), [range, custom]);
  const data = useDashboardData(window);

  // The charts already carry their own card and heading, so they render `bare`
  // — the widget adds the drag grip, not a second frame.
  const widgets: DashboardWidget[] = [
    {
      id: 'kpis',
      bare: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
      minH: 2,
      content: (
        <KpiCards
          venueCount={data.totals.venue}
          hostCount={data.totals.host}
          totalCount={data.totals.total}
          conversionRate={data.totals.conversionRate}
          uniqueServices={data.serviceTotals.uniqueServices}
          loading={data.loading && data.totals.total === 0}
        />
      ),
    },
    {
      id: 'stage-chart',
      bare: true,
      defaultLayout: { x: 0, y: 2, w: 8, h: 6 },
      minW: 4,
      minH: 4,
      content: <StageChart data={data.stageCounts} />,
    },
    {
      id: 'priority-chart',
      bare: true,
      defaultLayout: { x: 8, y: 2, w: 4, h: 6 },
      minW: 3,
      minH: 4,
      content: <PriorityChart slices={data.priorities} />,
    },
    {
      id: 'super-category-chart',
      bare: true,
      defaultLayout: { x: 0, y: 8, w: 12, h: 6 },
      minW: 4,
      minH: 4,
      content: <SuperCategoryChart data={data.superCategoryCounts} />,
    },
    {
      id: 'services-chart',
      bare: true,
      defaultLayout: { x: 0, y: 14, w: 12, h: 6 },
      minW: 4,
      minH: 4,
      content: <ServicesChart data={data.services} />,
    },
  ];

  return (
    <DuncitDashboard
      dashboardId="crm.overview"
      header={
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{
            alignItems: "center"
          }}>
            <DashboardIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                CRM Dashboard
              </Typography>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                Venue & host leads overview — counts, pipeline stages and priority mix.
              </Typography>
            </Box>
          </Stack>

          {/* The date window drives every widget, so it stays page-level. */}
          <RangeFilter
            range={range}
            custom={custom}
            onRangeChange={setRange}
            onCustomChange={setCustom}
          />

          {data.error && <Alert severity="error">{parseApiError(data.error)}</Alert>}
        </Stack>
      }
      widgets={widgets}
    />
  );
}
