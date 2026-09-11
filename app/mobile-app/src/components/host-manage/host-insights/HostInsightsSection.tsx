import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { StatTile } from '@/components/studio/StatTile';
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
} from '@duncit/utils';
import { InsightCard } from './InsightCard';
import { InsightsBars, InsightsDonut, InsightsLine } from './InsightCharts';
import { HostInsightsFilterSheet } from './HostInsightsFilterSheet';
import { semantic } from '@duncit/auth-tokens';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

const INFO = semantic.info;

interface Props {
  pods: ParticipantPod[];
  currency: string;
}

/** Host Insights (features 1 + 2) — Partner-Portal-synced KPIs plus four charts:
 * pods created over time (filterable), monthly earnings, status donut and the
 * participant trend. RN twin of mWeb's HostInsights. */
export function HostInsightsSection({ pods, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, primary } = useThemeColors();
  const { totalPods, hostEarning, statusCounts, monthlyEarnings } = useHostInsights();
  const [range, setRange] = useState<HostChartRange>(DEFAULT_HOST_CHART_RANGE);
  const [filterOpen, setFilterOpen] = useState(false);

  const overTime = buildPodsOverTime(
    pods.map((p) => p.pod_date_time),
    range,
  );
  const participants = buildParticipantTrend(pods);
  const slices = buildStatusSlices(statusCounts, semantic, t);
  const earnings = buildEarningsBars(monthlyEarnings);
  const meta = hostRangeMeta(range, t);

  return (
    <YStack gap={12} testID="host-insights-section">
      <SectionHeader title="Host Insights" />
      <XStack gap={12}>
        <StatTile label={t('mweb.common.totalPods')} value={String(totalPods)} size="lg" />
        <StatTile
          label={t('mweb.common.hostEarnings')}
          value={`${currency}${hostEarning.toFixed(2)}`}
        />
      </XStack>

      <InsightCard
        title={meta.title}
        empty={allZero(overTime)}
        action={
          <XStack
            testID="insights-filter-open"
            role="button"
            aria-label={t('mweb.common.filterPodsByMonth')}
            onPress={() => setFilterOpen(true)}
            width={36}
            height={36}
            alignItems="center"
            justifyContent="center"
            borderRadius={999}
            backgroundColor="$soft"
            pressStyle={PRESS_STYLE.ghost}
          >
            <MaterialIcons name="filter-list" size={18} color={ink} />
          </XStack>
        }
      >
        <InsightsLine data={overTime} color={primary} area />
      </InsightCard>

      <InsightCard title={t('mweb.common.monthlyHostEarnings')} empty={allZero(earnings)}>
        <InsightsBars data={earnings} color={primary} />
      </InsightCard>

      <InsightCard title={t('mweb.common.podStatusDistribution')} empty={allZero(slices)}>
        <InsightsDonut slices={slices} />
      </InsightCard>

      <InsightCard title={t('mweb.common.participantTrend')} empty={allZero(participants)}>
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
