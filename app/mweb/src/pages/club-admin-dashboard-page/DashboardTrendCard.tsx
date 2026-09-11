import { useMemo, useState } from 'react';
import { Card, CardContent, Stack, Typography, useTheme } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import {
  clubAdminSeriesLabels,
  clubAdminTrendSeries,
  type ClubAdminTrendKey,
  type ClubAdminTrendPoint,
} from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import PillChips from '../../components/club-admin/PillChips';
import { useTranslation } from '../../i18n/useTranslation';

const CHART_HEIGHT = 220;

interface Props {
  trend: ClubAdminTrendPoint[];
}

/**
 * The monthly trend, one line at a time: the four series share an x-axis but
 * not a scale (revenue in rupees beside pod counts), so on a phone each takes
 * the chart in turn, picked from the pill row. The Partners console overlays
 * them; the series, their order and their colours are the same.
 */
export default function DashboardTrendCard({ trend }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [active, setActive] = useState<ClubAdminTrendKey>('pods');
  const options = useMemo(() => {
    const labels = clubAdminSeriesLabels(t);
    return clubAdminTrendSeries.map((item) => ({ value: item.key, label: labels[item.key] }));
  }, [t]);
  const series = clubAdminTrendSeries.find((item) => item.key === active);
  const activeLabel = options.find((item) => item.value === active)?.label ?? '';
  const color = theme.palette[series?.palette ?? 'primary'].main;
  const hasData = trend.length >= 2;

  return (
    <Stack spacing={1.5}>
      <SectionHeader title={t('clubAdmin.dashboard.monthlyTrend')} />
      <Card>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack spacing={1.5}>
            <PillChips
              label={t('clubAdmin.dashboard.monthlyTrend')}
              showLabel={false}
              options={options}
              value={active}
              onChange={setActive}
            />
            {hasData ? (
              <LineChart
                height={CHART_HEIGHT}
                xAxis={[{ scaleType: 'point', data: trend.map((point) => point.label) }]}
                series={[
                  {
                    data: trend.map((point) => point[active]),
                    label: activeLabel,
                    color,
                    area: true,
                    showMark: true,
                  },
                ]}
                hideLegend
                aria-label={t('clubAdmin.dashboard.monthlyTrendChart')}
              />
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('clubAdmin.dashboard.trendEmpty')}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
