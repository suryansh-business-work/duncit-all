import { useMemo, useState } from 'react';
import { Card, CardContent, Chip, Stack, Typography, useTheme } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import {
  clubAdminSeriesLabels,
  clubAdminTrendSeries,
  type ClubAdminTrendKey,
  type ClubAdminTrendPoint,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

const CHART_HEIGHT = 220;

interface Props {
  trend: ClubAdminTrendPoint[];
}

/**
 * The monthly trend, one line at a time: the four series share an x-axis but
 * not a scale (revenue in rupees beside pod counts), so on a phone each takes
 * the chart in turn, picked from the chip row. The Partners console overlays
 * them; the series, their order and their colours are the same.
 */
export default function DashboardTrendCard({ trend }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [active, setActive] = useState<ClubAdminTrendKey>('pods');
  const labels = useMemo(() => clubAdminSeriesLabels(t), [t]);
  const series = clubAdminTrendSeries.find((item) => item.key === active);
  const color = theme.palette[series?.palette ?? 'primary'].main;
  const hasData = trend.length >= 2;

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('clubAdmin.dashboard.monthlyTrend')}
          </Typography>
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.75 }}>
            {clubAdminTrendSeries.map((item) => {
              const selected = item.key === active;
              return (
                <Chip
                  key={item.key}
                  label={labels[item.key]}
                  clickable
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  onClick={() => setActive(item.key)}
                />
              );
            })}
          </Stack>
          {hasData ? (
            <LineChart
              height={CHART_HEIGHT}
              xAxis={[{ scaleType: 'point', data: trend.map((point) => point.label) }]}
              series={[
                {
                  data: trend.map((point) => point[active]),
                  label: labels[active],
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
  );
}
