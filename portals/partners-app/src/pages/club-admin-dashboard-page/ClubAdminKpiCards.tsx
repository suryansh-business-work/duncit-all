import { Grid, Stack, Typography } from '@mui/material';
import { StatCard } from '@duncit/ui';
import type { ClubAdminKpis } from './queries';
import { formatCount, formatMoney, formatPercent, formatRating } from './format';
import { useTranslation } from '@duncit/shell';

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

type Translate = ReturnType<typeof useTranslation>['t'];

const groups = (t: Translate): GroupDef[] =>[
  {
    heading: t('partners.clubAdminDashboardPage.overview'),
    cards: [
      { key: 'assigned_clubs', label: t('partners.clubAdminDashboardPage.assignedClubs'), hint: 'Clubs you administer', value: (k) => formatCount(k.assigned_clubs) },
      { key: 'total_pods', label: t('partners.common.totalPods'), hint: 'Pods across your clubs', value: (k) => formatCount(k.total_pods) },
      { key: 'upcoming_pods', label: t('partners.clubAdminDashboardPage.upcomingPods'), hint: 'Scheduled from today', value: (k) => formatCount(k.upcoming_pods) },
      { key: 'completed_pods', label: t('partners.clubAdminDashboardPage.completedPods'), hint: 'Pods already wrapped up', value: (k) => formatCount(k.completed_pods) },
    ],
  },
  {
    heading: t('shell.nav.engagement'),
    cards: [
      { key: 'total_bookings', label: t('partners.clubAdminDashboardPage.totalBookings'), hint: 'Confirmed joins', value: (k) => formatCount(k.total_bookings) },
      { key: 'total_attendees', label: t('partners.clubAdminDashboardPage.totalAttendees'), hint: 'People across all pods', value: (k) => formatCount(k.total_attendees) },
      { key: 'fill_rate', label: t('partners.clubAdminDashboardPage.fillRate'), hint: 'Attendees vs spots', value: (k) => formatPercent(k.fill_rate) },
      { key: 'backed_out', label: t('partners.clubAdminDashboardPage.backedOut'), hint: 'Cancelled memberships', value: (k) => formatCount(k.backed_out) },
    ],
  },
  {
    heading: t('partners.clubAdminDashboardPage.community'),
    cards: [
      { key: 'total_followers', label: t('partners.clubAdminDashboardPage.totalFollowers'), hint: 'Across your clubs', value: (k) => formatCount(k.total_followers) },
      { key: 'new_followers', label: t('partners.clubAdminDashboardPage.newFollowers'), hint: 'Within the selected range', value: (k) => formatCount(k.new_followers) },
      { key: 'avg_rating', label: t('partners.clubAdminDashboardPage.avgRating'), hint: 'Average of user ratings', value: (k) => `${formatRating(k.avg_rating)} (${formatCount(k.ratings_count)})` },
      { key: 'active_hosts', label: t('partners.clubAdminDashboardPage.activeHosts'), hint: 'Distinct hosts running pods', value: (k) => formatCount(k.active_hosts) },
    ],
  },
  {
    heading: t('partners.clubAdminDashboardPage.revenue'),
    cards: [
      { key: 'total_revenue', label: t('partners.common.totalRevenue'), hint: 'Collected from successful payments', value: (k) => formatMoney(k.total_revenue, k.currency_symbol) },
      { key: 'total_spots', label: t('partners.clubAdminDashboardPage.totalSpots'), hint: 'Capacity across all pods', value: (k) => formatCount(k.total_spots) },
    ],
  },
];

interface Props {
  kpis: ClubAdminKpis;
  loading: boolean;
}

export default function ClubAdminKpiCards({ kpis, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2.5}>
      {groups(t).map((group) => (
        <Stack key={group.heading} spacing={1.25}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontWeight: 800,
              letterSpacing: 0.4
            }}>
            {group.heading}
          </Typography>
          <Grid container spacing={2}>
            {group.cards.map((card) => (
              <Grid
                key={card.key}
                size={{
                  xs: 12,
                  sm: 6,
                  md: 3
                }}>
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
