import { Grid } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { StatCard } from '@duncit/ui';
import { foodStatTiles, type FoodOwnerStats } from '@duncit/utils';

interface Props {
  stats: FoodOwnerStats;
}

/** The period's food numbers as tiles; WHICH tiles, and in what order, is `foodStatTiles`. */
export default function FoodStatTiles({ stats }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Grid container spacing={2} data-testid="food-dashboard-tiles">
      {foodStatTiles(stats, t).map((tile) => (
        <Grid key={tile.key} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label={tile.label}
            labelWeight={800}
            labelSx={{ lineHeight: 1.4 }}
            value={tile.value}
            valueVariant="h5"
            valueWeight={900}
            hint={tile.hint}
            headerSx={{ mb: 0.75 }}
            sx={{ height: '100%', borderRadius: 2 }}
            data-testid={`food-dashboard-tile-${tile.key}`}
          />
        </Grid>
      ))}
    </Grid>
  );
}
