import { Box, Card, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, useTheme } from '@mui/material';
import { formatDay } from '@duncit/app-settings';
import { formatCount, formatFoodMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { foodTrendLine, type FoodTrendKey } from './food-dashboard';
import type { FoodDailyPoint } from './queries';

const BOX = { width: 640, height: 180, pad: 10 } as const;
/** How tall the numbers table grows before it scrolls, in theme spacing units. */
const TABLE_MAX_HEIGHT = 36;

const SERIES: readonly { key: FoodTrendKey; palette: 'primary' | 'info'; labelKey: string }[] = [
  { key: 'revenue', palette: 'primary', labelKey: 'partners.foodDashboard.seriesRevenue' },
  { key: 'orders', palette: 'info', labelKey: 'partners.foodDashboard.seriesOrders' },
];

interface Props {
  daily: readonly FoodDailyPoint[];
  currencySymbol: string;
}

/**
 * Orders and revenue day by day. Two lines, each against its own peak, drawn as
 * inline SVG from the palette like the Host and Club Admin trends. The picture
 * is one image to a screen reader, so the same numbers sit in a table under it
 * that anybody can open.
 */
export default function FoodDailyChart({ daily, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const hasTrend = daily.length >= 2;

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid="food-dashboard-daily">
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 900 }}>
          {t('partners.foodDashboard.dailyTrend')}
        </Typography>
        {hasTrend ? (
          <>
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <svg
                width="100%"
                height={BOX.height}
                viewBox={`0 0 ${BOX.width} ${BOX.height}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={t('partners.foodDashboard.dailyChartLabel', {
                  vars: { from: formatDay(daily[0].date), to: formatDay(daily[daily.length - 1].date) },
                })}
              >
                {SERIES.map((series) => (
                  <polyline
                    key={series.key}
                    points={foodTrendLine(daily, series.key, BOX)}
                    fill="none"
                    stroke={theme.palette[series.palette].main}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>
            </Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', px: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {formatDay(daily[0].date)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {formatDay(daily[daily.length - 1].date)}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {SERIES.map((series) => (
                <Stack key={series.key} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Box aria-hidden sx={{ width: 12, height: 3, borderRadius: 1, bgcolor: `${series.palette}.main` }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t(series.labelKey)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('partners.foodDashboard.trendEmpty')}
          </Typography>
        )}
        {daily.length > 0 && (
          <Box component="details" data-testid="food-dashboard-daily-numbers">
            <Typography component="summary" variant="body2" sx={{ cursor: 'pointer', fontWeight: 700, py: 0.5 }}>
              {t('partners.foodDashboard.showNumbers')}
            </Typography>
            <TableContainer
              tabIndex={0}
              role="region"
              aria-label={t('partners.foodDashboard.dailyTrend')}
              sx={{ maxHeight: (muiTheme) => muiTheme.spacing(TABLE_MAX_HEIGHT), mt: 1 }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell component="th" scope="col">{t('partners.foodDashboard.colDate')}</TableCell>
                    <TableCell component="th" scope="col" align="right">{t('partners.foodDashboard.seriesOrders')}</TableCell>
                    <TableCell component="th" scope="col" align="right">{t('partners.foodDashboard.seriesRevenue')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {daily.map((point) => (
                    <TableRow key={point.date}>
                      <TableCell component="th" scope="row">{formatDay(point.date)}</TableCell>
                      <TableCell align="right">{formatCount(point.orders)}</TableCell>
                      <TableCell align="right">{formatFoodMoney(point.revenue, currencySymbol)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Stack>
    </Card>
  );
}
