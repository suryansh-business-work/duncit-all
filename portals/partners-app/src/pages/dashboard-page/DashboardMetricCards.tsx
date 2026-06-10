import { Card, CardContent, Stack, Typography } from '@mui/material';
import type { DashboardMetrics } from './dashboard.types';

const cards: Array<{ key: keyof DashboardMetrics; label: string; money?: boolean }> = [
  { key: 'total_earning', label: 'Total earning', money: true },
  { key: 'number_of_pods', label: 'Number of pods' },
  { key: 'pods_earning', label: 'Pods earning', money: true },
  { key: 'host_earning', label: 'Host earning', money: true },
  { key: 'product_earning', label: 'Product earning', money: true },
];

export const emptyMetrics: DashboardMetrics = {
  total_earning: 0,
  number_of_pods: 0,
  pods_earning: 0,
  venue_earning: 0,
  host_earning: 0,
  product_earning: 0,
};

export default function DashboardMetricCards({ metrics }: Readonly<{ metrics?: DashboardMetrics }>) {
  const data = metrics ?? emptyMetrics;
  return (
    <Stack direction="row" flexWrap="wrap" gap={1.5}>
      {cards.map((card) => (
        <Card key={card.key} variant="outlined" sx={{ borderRadius: 1.25, minWidth: { xs: '100%', sm: 156 }, flex: '1 1 156px' }}>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Typography variant="caption" color="text.secondary" fontWeight={900}>{card.label}</Typography>
            <Typography variant="h6" fontWeight={950}>{card.money ? formatMoney(Number(data[card.key])) : Number(data[card.key] || 0)}</Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}