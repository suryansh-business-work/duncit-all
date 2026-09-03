import { LinearProgress, Stack, Typography } from '@mui/material';
import { formatINR } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { PartnerProductPerformance } from './ecomm-dashboard.queries';

/** One product's bar: its share of the partner's best seller, plus what it earned. */
function ProductBar({
  row,
  best,
  unitsLabel,
}: Readonly<{ row: PartnerProductPerformance; best: number; unitsLabel: string }>) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
        <Typography variant="caption" noWrap sx={{ fontWeight: 800 }}>
          {row.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
          {formatINR(row.net_earnings)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={(row.gross_revenue / best) * 100}
        sx={{ height: 8, borderRadius: 999 }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {`${unitsLabel}: ${row.units_sold}`}
      </Typography>
    </Stack>
  );
}

/**
 * Products Performance — how each of the partner's products sold, best first.
 *
 * Bars are sized on GROSS (what shoppers spent, the fair comparison between
 * products) while the figure beside each one is NET (what the partner keeps
 * after the Duncit commission), so the chart answers "what sells" and "what it
 * paid me" at once. Drawn from the palette rather than a chart library, matching
 * the Host dashboard next door.
 */
export default function EcommProductsChart({
  rows,
}: Readonly<{ rows: readonly PartnerProductPerformance[] }>) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.ecommDashboardPage.noProductSalesYet')}
      </Typography>
    );
  }
  // Every bar is a share of the best seller, so the top product fills the row
  // and the rest read against it. Guarded: a product can sell at zero revenue.
  const best = Math.max(...rows.map((row) => row.gross_revenue), 1);
  const unitsLabel = t('partners.ecommDashboardPage.unitsSold');
  return (
    <Stack spacing={1.5}>
      {rows.map((row) => (
        <ProductBar key={row.product_id} row={row} best={best} unitsLabel={unitsLabel} />
      ))}
    </Stack>
  );
}
