import { useMemo, useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
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

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <DashboardIcon color="primary" />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            CRM Dashboard
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Venue & host leads overview — counts, pipeline stages and priority mix.
          </Typography>
        </Box>
      </Stack>

      <RangeFilter
        range={range}
        custom={custom}
        onRangeChange={setRange}
        onCustomChange={setCustom}
      />

      {data.error && <Alert severity="error">{parseApiError(data.error)}</Alert>}

      <KpiCards
        venueCount={data.totals.venue}
        hostCount={data.totals.host}
        totalCount={data.totals.total}
        conversionRate={data.totals.conversionRate}
        uniqueServices={data.serviceTotals.uniqueServices}
        loading={data.loading && data.totals.total === 0}
      />

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <StageChart data={data.stageCounts} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <PriorityChart slices={data.priorities} />
        </Box>
      </Stack>

      <SuperCategoryChart data={data.superCategoryCounts} />

      <ServicesChart data={data.services} />
    </Stack>
  );
}
