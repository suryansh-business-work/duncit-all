import { Grid } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { StatCard } from '@duncit/ui';
import { formatCount, money } from '../../lib/format';
import type { StoreDashboard } from './queries';

/** The period's headline numbers, one tile each. */
export default function KpiTiles({ board }: Readonly<{ board: StoreDashboard }>) {
  const { t } = useTranslation();
  const tiles = [
    { key: 'revenue', label: t('ecommPortal.dashboard.revenue'), value: money(board.revenue) },
    { key: 'orders', label: t('ecommPortal.nav.orders'), value: formatCount(board.orders) },
    { key: 'aov', label: t('ecommPortal.dashboard.aov'), value: money(board.average_order_value) },
    { key: 'units', label: t('ecommPortal.dashboard.units'), value: formatCount(board.units) },
    { key: 'customers', label: t('ecommPortal.nav.customers'), value: formatCount(board.customers) },
    { key: 'newCustomers', label: t('ecommPortal.dashboard.newCustomers'), value: formatCount(board.new_customers) },
    { key: 'cod', label: t('ecommPortal.dashboard.codShare'), value: t('ecommPortal.dashboard.percent', { vars: { value: board.cod_share_pct } }) },
    { key: 'cancelled', label: t('ecommPortal.customers.cancelled'), value: formatCount(board.cancelled) },
  ];
  return (
    <Grid container spacing={2}>
      {tiles.map((tile) => (
        <Grid key={tile.key} size={{ xs: 6, sm: 4, md: 3 }}>
          <StatCard label={tile.label} value={tile.value} valueNoWrap />
        </Grid>
      ))}
    </Grid>
  );
}
