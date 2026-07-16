import { Grid, Stack, Typography } from '@mui/material';
import { StatCard } from '@duncit/ui';
import type { ClubAdminKpis } from './queries';
import { formatCount, formatMoney, formatPercent, formatRating } from './format';

interface CardDef {
  key: string;
  label: string;
  hint: string;
  value: (k: ClubAdminKpis) => string;
}

interface GroupDef {
  heading: string;
  cards: CardDef[];
}

const GROUPS: GroupDef[] = [
  {
    heading: 'Overview',
    cards: [
      { key: 'assigned_clubs', label: 'Assigned Clubs', hint: 'Clubs you administer', value: (k) => formatCount(k.assigned_clubs) },
      { key: 'total_pods', label: 'Total Pods', hint: 'Pods across your clubs', value: (k) => formatCount(k.total_pods) },
      { key: 'upcoming_pods', label: 'Upcoming Pods', hint: 'Scheduled from today', value: (k) => formatCount(k.upcoming_pods) },
      { key: 'completed_pods', label: 'Completed Pods', hint: 'Pods already wrapped up', value: (k) => formatCount(k.completed_pods) },
    ],
  },
  {
    heading: 'Engagement',
    cards: [
      { key: 'total_bookings', label: 'Total Bookings', hint: 'Confirmed joins', value: (k) => formatCount(k.total_bookings) },
      { key: 'total_attendees', label: 'Total Attendees', hint: 'People across all pods', value: (k) => formatCount(k.total_attendees) },
      { key: 'fill_rate', label: 'Fill Rate', hint: 'Attendees vs spots', value: (k) => formatPercent(k.fill_rate) },
      { key: 'backed_out', label: 'Backed Out', hint: 'Cancelled memberships', value: (k) => formatCount(k.backed_out) },
    ],
  },
  {
    heading: 'Community',
    cards: [
      { key: 'total_followers', label: 'Total Followers', hint: 'Across your clubs', value: (k) => formatCount(k.total_followers) },
      { key: 'new_followers', label: 'New Followers', hint: 'Within the selected range', value: (k) => formatCount(k.new_followers) },
      { key: 'avg_rating', label: 'Avg Rating', hint: 'Average of user ratings', value: (k) => `${formatRating(k.avg_rating)} (${formatCount(k.ratings_count)})` },
      { key: 'active_hosts', label: 'Active Hosts', hint: 'Distinct hosts running pods', value: (k) => formatCount(k.active_hosts) },
    ],
  },
  {
    heading: 'Revenue',
    cards: [
      { key: 'total_revenue', label: 'Total Revenue', hint: 'Collected from successful payments', value: (k) => formatMoney(k.total_revenue, k.currency_symbol) },
      { key: 'total_spots', label: 'Total Spots', hint: 'Capacity across all pods', value: (k) => formatCount(k.total_spots) },
    ],
  },
];

interface Props {
  kpis: ClubAdminKpis;
  loading: boolean;
}

export default function ClubAdminKpiCards({ kpis, loading }: Readonly<Props>) {
  return (
    <Stack spacing={2.5}>
      {GROUPS.map((group) => (
        <Stack key={group.heading} spacing={1.25}>
          <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ letterSpacing: 0.4 }}>
            {group.heading}
          </Typography>
          <Grid container spacing={2}>
            {group.cards.map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.key}>
                <StatCard
                  label={card.label}
                  labelWeight={800}
                  labelSx={{ lineHeight: 1.4 }}
                  value={card.value(kpis)}
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
        </Stack>
      ))}
    </Stack>
  );
}
