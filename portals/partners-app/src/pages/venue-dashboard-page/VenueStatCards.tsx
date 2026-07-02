import { Card, CardContent, Grid, Skeleton, Stack, Typography } from '@mui/material';
import type { VenueOwnerStats } from './queries';

const formatMoney = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatCount = (value: number) => Number(value || 0).toLocaleString('en-IN');

interface CardDef {
  key: keyof VenueOwnerStats;
  label: string;
  hint: string;
  money?: boolean;
}

const CARDS: CardDef[] = [
  { key: 'potential_earning', label: 'Potential Earnings', hint: 'Value of every upcoming published slot', money: true },
  { key: 'booked_earning', label: 'Booked Value', hint: 'Upcoming slots already booked by pods', money: true },
  { key: 'total_venues', label: 'Total Venues', hint: 'Venues in the selected scope' },
  { key: 'total_capacity', label: 'Total Capacity', hint: 'Sum of all capacity entries' },
  { key: 'upcoming_slots', label: 'Upcoming Slots', hint: 'Published slots from today onwards' },
  { key: 'pending_requests', label: 'Pending Requests', hint: 'Slot bookings waiting for your approval' },
];

interface Props {
  stats: VenueOwnerStats;
  loading: boolean;
}

export default function VenueStatCards({ stats, loading }: Readonly<Props>) {
  return (
    <Grid container spacing={2}>
      {CARDS.map((card) => (
        <Grid item xs={12} sm={6} md={4} lg={2} key={card.key}>
          <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={0.75}>
                <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ lineHeight: 1.4 }}>
                  {card.label}
                </Typography>
                {loading ? (
                  <Skeleton variant="text" width={90} height={36} />
                ) : (
                  <Typography variant="h5" fontWeight={950}>
                    {card.money ? formatMoney(stats[card.key]) : formatCount(stats[card.key])}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {card.hint}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
