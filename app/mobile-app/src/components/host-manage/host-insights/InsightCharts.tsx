import { Dimensions } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { ChartDatum, StatusSlice } from '@/utils/host-insights';

const CHART_HEIGHT = 170;
const chartWidth = () => Dimensions.get('window').width - 88;

/** Bar chart (monthly earnings) — solid brand bars, token-coloured axes. */
export function InsightsBars({ data, color }: Readonly<{ data: ChartDatum[]; color: string }>) {
  const { muted, borderColor } = useThemeColors();
  return (
    <BarChart
      data={data.map((d) => ({ value: d.value, label: d.label, frontColor: color }))}
      height={CHART_HEIGHT}
      width={chartWidth()}
      barWidth={18}
      spacing={16}
      initialSpacing={12}
      barBorderRadius={4}
      noOfSections={4}
      yAxisThickness={0}
      xAxisColor={borderColor}
      rulesColor={borderColor}
      yAxisTextStyle={{ color: muted, fontSize: 10 }}
      xAxisLabelTextStyle={{ color: muted, fontSize: 10 }}
    />
  );
}

/** Line/area chart (pods over time, participant trend). */
export function InsightsLine({
  data,
  color,
  area,
}: Readonly<{ data: ChartDatum[]; color: string; area: boolean }>) {
  const { muted, borderColor } = useThemeColors();
  return (
    <LineChart
      data={data.map((d) => ({ value: d.value, label: d.label }))}
      height={CHART_HEIGHT}
      width={chartWidth()}
      color={color}
      thickness={2}
      curved
      areaChart={area}
      startFillColor={color}
      endFillColor={color}
      startOpacity={0.25}
      endOpacity={0.03}
      initialSpacing={12}
      spacing={Math.max(16, chartWidth() / Math.max(1, data.length))}
      noOfSections={4}
      yAxisThickness={0}
      xAxisColor={borderColor}
      rulesColor={borderColor}
      yAxisTextStyle={{ color: muted, fontSize: 10 }}
      xAxisLabelTextStyle={{ color: muted, fontSize: 10 }}
    />
  );
}

/** Donut chart (pod status distribution). */
export function InsightsDonut({ slices }: Readonly<{ slices: StatusSlice[] }>) {
  return (
    <PieChart
      donut
      radius={90}
      innerRadius={55}
      data={slices.map((s) => ({ value: s.value, color: s.color }))}
    />
  );
}
