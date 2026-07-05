import { Box, Grid, Stack, Typography } from '@mui/material';
import { AppIcon } from '@duncit/shell';
import KpiCard from './KpiCard';
import type { FounderMetric } from './types';

interface Props {
  title: string;
  icon?: string;
  metrics: readonly FounderMetric[];
  highlight?: boolean;
  onInfo: (metric: FounderMetric) => void;
  onSettings: (metric: FounderMetric) => void;
}

/** A titled section of KPI cards (used for the headline row and each category). */
export default function MetricGrid({ title, icon, metrics, highlight, onInfo, onSettings }: Readonly<Props>) {
  if (metrics.length === 0) return null;
  return (
    <Box sx={{ mb: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        {icon && <AppIcon name={icon} color="primary" />}
        <Typography variant={highlight ? 'h6' : 'subtitle1'} sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        {metrics.map((metric) => (
          <Grid key={metric.key} item xs={12} sm={6} md={highlight ? 3 : 4} lg={highlight ? 2 : 3}>
            <KpiCard metric={metric} onInfo={onInfo} onSettings={onSettings} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
