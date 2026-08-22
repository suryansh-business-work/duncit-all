import { Grid } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import type { VenueOwnerStats } from './queries';
import { useTranslation } from '@duncit/shell';

const formatCount = (value: number) => Number(value || 0).toLocaleString('en-IN');

interface CardDef {
  key: keyof VenueOwnerStats;
  label: string;
  hint: string;
  money?: boolean;
}

type Translate = ReturnType<typeof useTranslation>['t'];

const cards = (t: Translate): CardDef[] =>[
  { key: 'potential_earning', label: t('partners.venueDashboardPage.potentialEarnings'), hint: 'Value of every upcoming published slot', money: true },
  { key: 'booked_earning', label: t('partners.venueDashboardPage.bookedValue'), hint: 'Upcoming slots already booked by pods', money: true },
  { key: 'total_venues', label: t('partners.venueDashboardPage.totalVenues'), hint: 'Venues in the selected scope' },
  { key: 'total_capacity', label: t('partners.venueDashboardPage.totalCapacity'), hint: 'Sum of all capacity entries' },
  { key: 'upcoming_slots', label: t('partners.venueDashboardPage.upcomingSlots'), hint: 'Published slots from today onwards' },
  { key: 'pending_requests', label: t('partners.venueDashboardPage.pendingRequests'), hint: 'Slot bookings waiting for your approval' },
];

interface Props {
  stats: VenueOwnerStats;
  loading: boolean;
}

export default function VenueStatCards({ stats, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Grid container spacing={2}>
      {cards(t).map((card) => (
        <Grid item xs={12} sm={6} md={4} lg={2} key={card.key}>
          <StatCard
            label={card.label}
            labelWeight={800}
            labelSx={{ lineHeight: 1.4 }}
            value={card.money ? formatMoney(stats[card.key]) : formatCount(stats[card.key])}
            valueWeight={950}
            hint={card.hint}
            loading={loading}
            skeletonProps={{ width: 90, height: 36 }}
            headerSx={{ mb: 0.75 }}
            sx={{ height: '100%', borderRadius: 2 }}
          />
        </Grid>
      ))}
    </Grid>
  );
}
