import { Grid } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { StatCard } from '@duncit/ui';
import { formatCount } from '../../lib/format';
import type { StoreDashboard } from './queries';

/** What is waiting on the team right now, each tile opening the page that deals with it. */
export default function AttentionRow({ board }: Readonly<{ board: StoreDashboard }>) {
  const { t } = useTranslation();
  const tiles = [
    { key: 'toShip', label: t('ecommPortal.dashboard.toShip'), value: board.to_ship, to: '/orders' },
    { key: 'returns', label: t('ecommPortal.dashboard.returnsOpen'), value: board.returns_open, to: '/returns' },
    { key: 'outOfStock', label: t('ecommPortal.dashboard.outOfStock'), value: board.out_of_stock, to: '/products' },
    { key: 'lowStock', label: t('ecommPortal.dashboard.lowStock'), value: board.low_stock, to: '/products' },
    { key: 'carts', label: t('ecommPortal.nav.carts'), value: board.abandoned_carts, to: '/carts' },
    { key: 'listed', label: t('ecommPortal.dashboard.listed'), value: board.listed_products, to: '/products' },
  ];
  return (
    <Grid container spacing={2} component="nav" aria-label={t('ecommPortal.dashboard.attention')}>
      {tiles.map((tile) => (
        <Grid key={tile.key} size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label={tile.label} value={formatCount(tile.value)} to={tile.to} labelVariant="caption" />
        </Grid>
      ))}
    </Grid>
  );
}
