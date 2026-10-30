import { Grid } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import { StatCard } from '@duncit/ui';

/** One headline number on a Loyalty dashboard, and the page it opens. */
export interface StatTile {
  key: string;
  label: string;
  value: string;
  /** One line under the value saying what it counts. */
  hint?: string;
  loading: boolean;
  icon: SvgIconComponent;
  /** A theme palette value — it is tinted for the icon box. */
  color: string;
  /** Left out when no page holds more on the number; the tile is then not a link. */
  to?: string;
}

interface Props {
  tiles: readonly StatTile[];
  /** Prefix of each tile's test id (`<prefix>-<key>`). */
  testIdPrefix: string;
}

/** A dashboard's KPI strip: four tiles a row on a desktop, two on a tablet, one on a phone. */
export default function StatTileGrid({ tiles, testIdPrefix }: Readonly<Props>) {
  return (
    <Grid container spacing={2}>
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Grid key={tile.key} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              layout="split"
              label={tile.label}
              value={tile.value}
              hint={tile.hint}
              valueVariant="h5"
              loading={tile.loading}
              icon={<Icon fontSize="small" />}
              iconBox={{ color: tile.color, alpha: 0.1, size: 40, radius: 1.5 }}
              to={tile.to}
              cardVariant="elevation"
              sx={{ height: '100%' }}
              testId={`${testIdPrefix}-${tile.key}`}
            />
          </Grid>
        );
      })}
    </Grid>
  );
}
