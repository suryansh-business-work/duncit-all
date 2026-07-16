import { Grid } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { SUMMARY_TILES, type SummaryTileKey } from './queries';

interface Props {
  totals: Record<SummaryTileKey, number> | null | undefined;
  loading: boolean;
}

export default function SummaryTiles({ totals, loading }: Readonly<Props>) {
  return (
    <Grid container spacing={2}>
      {SUMMARY_TILES.map((t) => {
        const Icon = t.icon;
        const value = loading ? '…' : totals?.[t.key] ?? 0;
        return (
          <Grid item xs={6} sm={4} md={2.4} key={t.key}>
            <StatCard
              layout="split"
              label={t.label}
              value={value}
              valueVariant="h4"
              icon={<Icon fontSize="small" />}
              iconBox={{ color: t.color, alpha: 0.1, size: 40, radius: 1.5 }}
              to={t.to}
              cardVariant="elevation"
              sx={{ height: '100%' }}
            />
          </Grid>
        );
      })}
    </Grid>
  );
}
