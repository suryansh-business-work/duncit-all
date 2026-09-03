import { useMemo } from 'react';
import { Box, Card, Stack, Typography, useTheme } from '@mui/material';
import {
  clubAdminSeriesLabels,
  clubAdminTrendSeries,
  type ClubAdminTrendKey,
  type ClubAdminTrendPoint,
} from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

const WIDTH = 640;
const HEIGHT = 200;
const PAD = 8;

function buildLine(points: readonly ClubAdminTrendPoint[], key: ClubAdminTrendKey): string {
  const values = points.map((point) => point[key]);
  const max = Math.max(...values, 0);
  const span = max || 1;
  const step = points.length > 1 ? WIDTH / (points.length - 1) : 0;
  return points
    .map((point, index) => {
      const x = index * step;
      const y = HEIGHT - PAD - (point[key] / span) * (HEIGHT - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

interface Props {
  trend: ClubAdminTrendPoint[];
}

export default function ClubAdminTrendChart({ trend }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const seriesLabels = useMemo(() => clubAdminSeriesLabels(t), [t]);
  const hasData = trend.length >= 2;

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" sx={{
          fontWeight: 900
        }}>{t('clubAdmin.dashboard.monthlyTrend')}</Typography>
        {hasData ? (
          <>
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={t('clubAdmin.dashboard.monthlyTrendChart')}>
                {clubAdminTrendSeries.map((series) => (
                  <polyline
                    key={series.key}
                    points={buildLine(trend, series.key)}
                    fill="none"
                    stroke={theme.palette[series.palette].main}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>
            </Box>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                justifyContent: "space-between",
                px: 0.5
              }}>
              {trend.map((point, index) => (
                <Typography key={`${point.label}-${index}`} variant="caption" sx={{
                  color: "text.secondary"
                }}>{point.label}</Typography>
              ))}
            </Stack>
            <Stack direction="row" spacing={2} sx={{
              flexWrap: "wrap"
            }}>
              {clubAdminTrendSeries.map((series) => (
                <Stack key={series.key} direction="row" spacing={0.75} sx={{
                  alignItems: "center"
                }}>
                  <Box sx={{ width: 12, height: 3, borderRadius: 1, bgcolor: theme.palette[series.palette].main }} />
                  <Typography variant="caption" sx={{
                    color: "text.secondary"
                  }}>{seriesLabels[series.key]}</Typography>
                </Stack>
              ))}
            </Stack>
          </>
        ) : (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>{t('clubAdmin.dashboard.trendEmpty')}</Typography>
        )}
      </Stack>
    </Card>
  );
}
