import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FilterListIcon from '@mui/icons-material/FilterList';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { DuncitIconButton } from '@duncit/buttons';
import { semantic } from '@duncit/auth-tokens';
import InsightChartCard from './InsightChartCard';
import HostInsightsFilterSheet from './HostInsightsFilterSheet';
import StatCard from './StatCard';
import SectionHeader from '../../components/SectionHeader';
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
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

const ALL_TIME_FROM = '1970-01-01T00:00:00.000Z';
const CHART_HEIGHT = 220;
const BAR_RADIUS = 6;
const INFO = semantic.info;
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

/** Host Insights (features 1 + 2) — Partner-Portal-synced KPIs plus four charts:
 * pods created over time (filterable), monthly earnings, status donut and the
 * participant trend. Rendered below the Create-pod row on the Host Dashboard. */
export default function HostInsights({ pods, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  const primary = useTheme().palette.primary.main;
  const [range, setRange] = useState<HostChartRange>(DEFAULT_HOST_CHART_RANGE);
  const [filterOpen, setFilterOpen] = useState(false);
  const now = useMemo(() => new Date().toISOString(), []);
  const { data } = useQuery<any>(HOST_INSIGHTS, {
    variables: { from: ALL_TIME_FROM, to: now, months: 12 },
    fetchPolicy: 'cache-and-network',
  });

  const kpi = data?.partnerDashboard?.host;
  const insights = data?.hostInsights;
  const totalPods = kpi?.number_of_pods ?? 0;
  const hostEarning = kpi?.host_earning ?? 0;

  const overTime = buildPodsOverTime(pods.map((p) => p.pod_date_time), range);
  const participants = buildParticipantTrend(pods);
  const statusSlices = buildStatusSlices(insights?.status_counts ?? EMPTY_COUNTS, semantic, t);
  const earnings = buildEarningsBars(insights?.monthly_earnings ?? []);
  const meta = hostRangeMeta(range, t);

  return (
    <Stack spacing={1.5}>
      <SectionHeader title="Host Insights" />
      <Stack direction="row" spacing={1.5}>
        <StatCard label={t('mweb.common.totalPods')} value={String(totalPods)} size="lg" />
        <StatCard label={t('mweb.common.hostEarnings')} value={`${currency}${hostEarning.toFixed(2)}`} />
      </Stack>

      <InsightChartCard
        title={meta.title}
        empty={allZero(overTime)}
        action={
          <Tooltip title={t('mweb.common.filter')}>
            <DuncitIconButton
              aria-label={t('mweb.common.filterPodsByMonth')}
              onClick={() => setFilterOpen(true)}
              sx={{ width: 36, height: 36, minHeight: 36, bgcolor: 'action.hover' }}
            >
              <FilterListIcon fontSize="small" />
            </DuncitIconButton>
          </Tooltip>
        }
      >
        <LineChart
          height={CHART_HEIGHT}
          xAxis={[{ scaleType: 'point', data: overTime.map((d) => d.label) }]}
          series={[{ data: overTime.map((d) => d.value), color: primary, area: true, showMark: true }]}
        />
      </InsightChartCard>

      <InsightChartCard title={t('mweb.common.monthlyHostEarnings')} empty={allZero(earnings)}>
        <BarChart
          height={CHART_HEIGHT}
          borderRadius={BAR_RADIUS}
          xAxis={[{ scaleType: 'band', data: earnings.map((d) => d.label) }]}
          series={[{ data: earnings.map((d) => d.value), color: primary }]}
        />
      </InsightChartCard>

      <InsightChartCard title={t('mweb.common.podStatusDistribution')} empty={allZero(statusSlices)}>
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

      <InsightChartCard title={t('mweb.common.participantTrend')} empty={allZero(participants)}>
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
