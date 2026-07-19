import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Box, Card, CardContent, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import FilterListIcon from '@mui/icons-material/FilterList';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import InsightChartCard from './InsightChartCard';
import HostInsightsFilterSheet from './HostInsightsFilterSheet';
import { HOST_INSIGHTS } from './queries';
import {
  DEFAULT_HOST_CHART_RANGE,
  allZero,
  buildEarningsBars,
  buildParticipantTrend,
  buildPodsOverTime,
  buildStatusSlices,
  hostRangeMeta,
  type HostChartRange,
} from './insights';

const ALL_TIME_FROM = '1970-01-01T00:00:00.000Z';
const CHART_HEIGHT = 220;
const PRIMARY = '#ff5757';
const INFO = '#3b82f6';
const EMPTY_COUNTS = { upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 };

interface HostPod {
  pod_date_time?: string | null;
  pod_attendees?: unknown[] | null;
  pod_hosts_id?: unknown[] | null;
}

interface Props {
  pods: HostPod[];
  currency: string;
}

/** One KPI tile (Total Pods / Host Earnings), synced to the Partner Portal. */
function KpiTile({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Card variant="outlined" sx={{ flex: 1, borderRadius: 3 }}>
      <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 950 }} noWrap>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 950 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

/** Host Insights (features 1 + 2) — Partner-Portal-synced KPIs plus four charts:
 * pods created over time (filterable), monthly earnings, status donut and the
 * participant trend. Rendered below the Create-pod row on the Host Dashboard. */
export default function HostInsights({ pods, currency }: Readonly<Props>) {
  const [range, setRange] = useState<HostChartRange>(DEFAULT_HOST_CHART_RANGE);
  const [filterOpen, setFilterOpen] = useState(false);
  const now = useMemo(() => new Date().toISOString(), []);
  const { data } = useQuery(HOST_INSIGHTS, {
    variables: { from: ALL_TIME_FROM, to: now, months: 12 },
    fetchPolicy: 'cache-and-network',
  });

  const kpi = data?.partnerDashboard?.host;
  const insights = data?.hostInsights;
  const totalPods = kpi?.number_of_pods ?? 0;
  const hostEarning = kpi?.host_earning ?? 0;

  const overTime = buildPodsOverTime(pods.map((p) => p.pod_date_time), range);
  const participants = buildParticipantTrend(pods);
  const statusSlices = buildStatusSlices(insights?.status_counts ?? EMPTY_COUNTS);
  const earnings = buildEarningsBars(insights?.monthly_earnings ?? []);
  const meta = hostRangeMeta(range);

  return (
    <Stack spacing={2.25}>
      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: 'common.white', background: 'linear-gradient(135deg, #ff4f73, #ff7a59)' }}>
              <InsightsIcon fontSize="small" />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
              Host Insights
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <KpiTile label="Total Pods" value={String(totalPods)} />
            <KpiTile label="Host Earnings" value={`${currency}${hostEarning.toFixed(2)}`} />
          </Stack>
        </CardContent>
      </Card>

      <InsightChartCard
        title={meta.title}
        subtitle={meta.description}
        empty={allZero(overTime)}
        action={
          <Tooltip title="Filter">
            <IconButton size="small" aria-label="Filter pods by month" onClick={() => setFilterOpen(true)}>
              <FilterListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        }
      >
        <LineChart
          height={CHART_HEIGHT}
          xAxis={[{ scaleType: 'point', data: overTime.map((d) => d.label) }]}
          series={[{ data: overTime.map((d) => d.value), color: PRIMARY, area: true, showMark: true }]}
        />
      </InsightChartCard>

      <InsightChartCard title="Monthly Host Earnings" subtitle="Approved payouts by month." empty={allZero(earnings)}>
        <BarChart
          height={CHART_HEIGHT}
          xAxis={[{ scaleType: 'band', data: earnings.map((d) => d.label) }]}
          series={[{ data: earnings.map((d) => d.value), color: PRIMARY }]}
        />
      </InsightChartCard>

      <InsightChartCard title="Pod Status Distribution" subtitle="Upcoming, ongoing, completed and cancelled." empty={allZero(statusSlices)}>
        <PieChart
          height={CHART_HEIGHT}
          series={[
            {
              innerRadius: 50,
              data: statusSlices.map((s, i) => ({ id: i, value: s.value, label: s.label, color: s.color })),
            },
          ]}
        />
      </InsightChartCard>

      <InsightChartCard title="Participant Trend" subtitle="Guests per pod over time." empty={allZero(participants)}>
        <LineChart
          height={CHART_HEIGHT}
          xAxis={[{ scaleType: 'point', data: participants.map((d) => d.label) }]}
          series={[{ data: participants.map((d) => d.value), color: INFO, area: true, showMark: false }]}
        />
      </InsightChartCard>

      <HostInsightsFilterSheet
        open={filterOpen}
        initial={range}
        hasPods={pods.length > 0}
        onApply={(next) => {
          setRange(next);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </Stack>
  );
}
