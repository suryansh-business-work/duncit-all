import { Box } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { formatCount, formatINR } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { BrandAnalytics } from './queries';

interface Tile {
  id: string;
  label: string;
  value: string;
}

/** The headline figures, zeros included — an empty window still reads as one. */
export function KpiTiles({ analytics }: Readonly<{ analytics: BrandAnalytics }>) {
  const { t } = useTranslation();
  const tiles: Tile[] = [
    { id: 'orders', label: t('shell.brandConsole.kpiOrders'), value: formatCount(analytics.orders) },
    { id: 'units', label: t('shell.brandConsole.kpiUnits'), value: formatCount(analytics.units_sold) },
    { id: 'gross', label: t('shell.brandConsole.kpiGross'), value: formatINR(analytics.gross_revenue) },
    { id: 'net', label: t('shell.brandConsole.kpiNet'), value: formatINR(analytics.net_earnings) },
    { id: 'aov', label: t('shell.brandConsole.kpiAov'), value: formatINR(analytics.average_order_value) },
    { id: 'views', label: t('shell.brandConsole.kpiViews'), value: formatCount(analytics.product_views) },
    { id: 'clicks', label: t('shell.brandConsole.kpiClicks'), value: formatCount(analytics.product_clicks) },
    {
      id: 'live',
      label: t('shell.brandConsole.kpiLive'),
      value: t('shell.brandConsole.liveOf', {
        vars: { live: formatCount(analytics.live_products), total: formatCount(analytics.total_products) },
      }),
    },
  ];
  return (
    <Box
      component="ul"
      sx={(theme) => ({
        display: 'grid',
        gap: 2,
        gridTemplateColumns: `repeat(auto-fill,minmax(${theme.spacing(22)},1fr))`,
        listStyle: 'none',
        m: 0,
        p: 0,
      })}
    >
      {tiles.map((tile) => (
        <Box component="li" key={tile.id} sx={{ minWidth: 0 }}>
          <StatCard
            label={tile.label}
            value={tile.value}
            testId={`brand-analytics-tile-${tile.id}`}
            sx={{ height: '100%' }}
          />
        </Box>
      ))}
    </Box>
  );
}
