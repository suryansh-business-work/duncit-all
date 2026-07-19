import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useHostInsights } from '@/hooks/useHostInsights';
import {
  DEFAULT_HOST_CHART_RANGE,
  allZero,
  buildEarningsBars,
  buildParticipantTrend,
  buildPodsOverTime,
  buildStatusSlices,
  hostRangeMeta,
  type HostChartRange,
  type ParticipantPod,
} from '@/utils/host-insights';
import { InsightCard } from './InsightCard';
import { InsightsBars, InsightsDonut, InsightsLine } from './InsightCharts';
import { HostInsightsFilterSheet } from './HostInsightsFilterSheet';

const PRIMARY = '#ff5757';
const INFO = '#3b82f6';

interface Props {
  pods: ParticipantPod[];
  currency: string;
}

/** One KPI tile (Total Pods / Host Earnings), synced to the Partner Portal. */
function KpiTile({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <YStack
      flex={1}
      padding={12}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$background"
    >
      <Text fontSize={11} fontWeight="900" color="$primary">
        {label}
      </Text>
      <Text fontSize={18} fontWeight="900" color="$color" marginTop={2}>
        {value}
      </Text>
    </YStack>
  );
}

/** Host Insights (features 1 + 2) — Partner-Portal-synced KPIs plus four charts:
 * pods created over time (filterable), monthly earnings, status donut and the
 * participant trend. RN twin of mWeb's HostInsights. */
export function HostInsightsSection({ pods, currency }: Readonly<Props>) {
  const { color: ink } = useThemeColors();
  const { totalPods, hostEarning, statusCounts, monthlyEarnings } = useHostInsights();
  const [range, setRange] = useState<HostChartRange>(DEFAULT_HOST_CHART_RANGE);
  const [filterOpen, setFilterOpen] = useState(false);

  const overTime = buildPodsOverTime(
    pods.map((p) => p.pod_date_time),
    range,
  );
  const participants = buildParticipantTrend(pods);
  const slices = buildStatusSlices(statusCounts);
  const earnings = buildEarningsBars(monthlyEarnings);
  const meta = hostRangeMeta(range);

  return (
    <YStack gap={14} testID="host-insights-section">
      <YStack
        gap={10}
        padding={14}
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <XStack alignItems="center" gap={8}>
          <MaterialIcons name="insights" size={18} color={ink} />
          <Text fontSize={15} fontWeight="900" color="$color">
            Host Insights
          </Text>
        </XStack>
        <XStack gap={10}>
          <KpiTile label="Total Pods" value={String(totalPods)} />
          <KpiTile label="Host Earnings" value={`${currency}${hostEarning.toFixed(2)}`} />
        </XStack>
      </YStack>

      <InsightCard
        title={meta.title}
        subtitle={meta.description}
        empty={allZero(overTime)}
        action={
          <XStack
            testID="insights-filter-open"
            role="button"
            aria-label="Filter pods by month"
            onPress={() => setFilterOpen(true)}
            width={34}
            height={34}
            alignItems="center"
            justifyContent="center"
            borderRadius={10}
            borderWidth={1}
            borderColor="$borderColor"
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="filter-list" size={18} color={ink} />
          </XStack>
        }
      >
        <InsightsLine data={overTime} color={PRIMARY} area />
      </InsightCard>

      <InsightCard
        title="Monthly Host Earnings"
        subtitle="Approved payouts by month."
        empty={allZero(earnings)}
      >
        <InsightsBars data={earnings} color={PRIMARY} />
      </InsightCard>

      <InsightCard
        title="Pod Status Distribution"
        subtitle="Upcoming, ongoing, completed and cancelled."
        empty={allZero(slices)}
      >
        <InsightsDonut slices={slices} />
      </InsightCard>

      <InsightCard
        title="Participant Trend"
        subtitle="Guests per pod over time."
        empty={allZero(participants)}
      >
        <InsightsLine data={participants} color={INFO} area />
      </InsightCard>

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
    </YStack>
  );
}
