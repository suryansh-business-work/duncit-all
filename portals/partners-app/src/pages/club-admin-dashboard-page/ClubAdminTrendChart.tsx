import { Box, Card, Stack, Typography, useTheme } from '@mui/material';
import type { ClubAdminTrendPoint } from './queries';
import { useTranslation } from '@duncit/shell';

type MetricKey = 'pods' | 'bookings' | 'followers' | 'revenue';
type PaletteKey = 'primary' | 'success' | 'info' | 'warning';

interface SeriesDef {
  key: MetricKey;
  label: string;
  palette: PaletteKey;
}

type Translate = ReturnType<typeof useTranslation>['t'];

const series = (t: Translate): SeriesDef[] =>[
  { key: 'pods', label: t('shell.nav.pods'), palette: 'primary' },
  { key: 'bookings', label: t('partners.clubAdminDashboardPage.bookings'), palette: 'success' },
  { key: 'followers', label: t('partners.common.followers'), palette: 'info' },
  { key: 'revenue', label: t('partners.clubAdminDashboardPage.revenue'), palette: 'warning' },
];

const WIDTH = 640;
const HEIGHT = 200;
const PAD = 8;

function buildLine(points: readonly ClubAdminTrendPoint[], key: MetricKey): string {
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
  const hasData = trend.length >= 2;

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" fontWeight={900}>{t('partners.clubAdminDashboardPage.monthlyTrend')}</Typography>
        {hasData ? (
          <>
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={t('partners.clubAdminDashboardPage.monthlyTrendChart')}>
                {series(t).map((series) => (
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
            <Stack direction="row" spacing={1.5} justifyContent="space-between" sx={{ px: 0.5 }}>
              {trend.map((point, index) => (
                <Typography key={`${point.label}-${index}`} variant="caption" color="text.secondary">{point.label}</Typography>
              ))}
            </Stack>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {series(t).map((series) => (
                <Stack key={series.key} direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 12, height: 3, borderRadius: 1, bgcolor: theme.palette[series.palette].main }} />
                  <Typography variant="caption" color="text.secondary">{series.label}</Typography>
                </Stack>
              ))}
            </Stack>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">{t('partners.clubAdminDashboardPage.notEnoughDataToDrawA')}</Typography>
        )}
      </Stack>
    </Card>
  );
}
