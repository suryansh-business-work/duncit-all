import { useState } from 'react';
import { Text, YStack } from 'tamagui';
import {
  allZero,
  clubAdminSeriesLabels,
  clubAdminTrendSeries,
  type ChartDatum,
  type ClubAdminTrendKey,
  type ClubAdminTrendPoint,
} from '@duncit/utils';

import { ChipSelectField } from '@/components/create-pod';
import { InsightsLine } from '@/components/host-manage/host-insights/InsightCharts';
import { useTranslation } from '@/hooks/useTranslation';
import { useTrendPalette } from '../tone';

interface Props {
  trend: readonly ClubAdminTrendPoint[];
}

/**
 * The monthly trend, one series at a time — a phone has no room for four
 * lines and a legend, so the legend became the chip row that picks the line.
 * The series, their order and their palette are the shared list.
 */
export function TrendCard({ trend }: Readonly<Props>) {
  const { t } = useTranslation();
  const palette = useTrendPalette();
  const [series, setSeries] = useState<ClubAdminTrendKey>('pods');
  const labels = clubAdminSeriesLabels(t);
  const options = clubAdminTrendSeries.map((item) => ({
    value: item.key,
    label: labels[item.key],
  }));
  const paletteName =
    clubAdminTrendSeries.find((item) => item.key === series)?.palette ?? 'primary';
  const data: ChartDatum[] = trend.map((point) => ({ label: point.label, value: point[series] }));

  return (
    <YStack
      gap={10}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      testID="club-dashboard-trend"
    >
      <Text fontSize={15} fontWeight="700" color="$color">
        {t('clubAdmin.dashboard.monthlyTrend')}
      </Text>
      <ChipSelectField
        label=""
        options={options}
        value={series}
        onChange={(next) => setSeries(next as ClubAdminTrendKey)}
        testID="club-dashboard-series"
      />
      {allZero(data) ? (
        <Text testID="club-dashboard-trend-empty" fontSize={13} color="$muted">
          {t('clubAdmin.dashboard.trendEmpty')}
        </Text>
      ) : (
        <InsightsLine data={data} color={palette[paletteName]} area />
      )}
    </YStack>
  );
}
