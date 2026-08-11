import { Grid } from '@mui/material';
import { StatCard } from '@duncit/ui';
import {
  COIN_TILES,
  coinCount,
  coinValue,
  type CoinAdminStats,
  type CoinTile,
} from './queries';

interface Props {
  stats: CoinAdminStats | null | undefined;
  loading: boolean;
}

/** A tile's headline number: a rate reads as a percentage, everything else is
 * a coin count. Computed here so the JSX below stays free of nested ternaries. */
function tileValue(tile: CoinTile, stats: CoinAdminStats): string {
  const raw = stats[tile.key];
  if (tile.percent) return `${raw}%`;
  return coinCount(raw);
}

export default function CoinStatTiles({ stats, loading }: Readonly<Props>) {
  return (
    <Grid container spacing={2}>
      {COIN_TILES.map((tile) => {
        const Icon = tile.icon;
        const hint = stats && tile.showValueHint
          ? coinValue(stats[tile.key], stats.currency_symbol)
          : undefined;
        // Four across rather than six: the earn rate became two tiles when pod
        // joins and shop orders got their own rates, and seven tiles at
        // six-per-row leave a single orphan on the second line.
        return (
          <Grid item xs={6} sm={4} md={3} key={tile.key}>
            <StatCard
              layout="split"
              label={tile.label}
              value={stats ? tileValue(tile, stats) : '—'}
              hint={hint}
              valueVariant="h5"
              loading={loading && !stats}
              icon={<Icon fontSize="small" />}
              iconBox={{ color: tile.color, alpha: 0.1, size: 40, radius: 1.5 }}
              to={tile.to}
              cardVariant="elevation"
              sx={{ height: '100%' }}
            />
          </Grid>
        );
      })}
    </Grid>
  );
}
