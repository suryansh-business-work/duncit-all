import { Card, CardContent, Stack, Typography } from '@mui/material';
import type { DashboardMetrics, DashboardTab } from './dashboard.types';

interface MetricCard {
  key: keyof DashboardMetrics;
  label: string;
  money?: boolean;
}

// The earning card is named for the active partner role: a venue partner sees
// "Venue earning" (not "Host earning"); the venue tab also surfaces Added slots.
function cardsForTab(tab: DashboardTab): MetricCard[] {
  const cards: MetricCard[] = [
    { key: 'total_earning', label: 'Total earning', money: true },
    { key: 'number_of_pods', label: 'Number of pods' },
    { key: 'pods_earning', label: 'Pods earning', money: true },
  ];
  if (tab === 'venue') cards.push({ key: 'venue_earning', label: 'Venue earning', money: true });
  else if (tab === 'host') cards.push({ key: 'host_earning', label: 'Host earning', money: true });
  cards.push({ key: 'product_earning', label: 'Product earning', money: true });
  if (tab === 'venue') cards.push({ key: 'added_slots', label: 'Added slots' });
  return cards;
}

export const emptyMetrics: DashboardMetrics = {
  total_earning: 0,
  number_of_pods: 0,
  pods_earning: 0,
  venue_earning: 0,
  host_earning: 0,
  product_earning: 0,
  added_slots: 0,
};

export default function DashboardMetricCards({
  metrics,
  tab,
}: Readonly<{ metrics?: DashboardMetrics; tab: DashboardTab }>) {
  const data = metrics ?? emptyMetrics;
  const cards = cardsForTab(tab);
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