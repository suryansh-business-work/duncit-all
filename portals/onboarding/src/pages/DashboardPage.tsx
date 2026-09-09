import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, Card, CardActionArea, CardContent, CircularProgress, Typography } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { AccountSummaryCard } from '@duncit/shell';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { useProductVisibility, useTranslation } from '@duncit/app-settings';
import DashboardHeader from './dashboard/DashboardHeader';
import DashboardKpis from './dashboard/DashboardKpis';
import MeetingScheduleStrip from './dashboard/MeetingScheduleStrip';
import StatusBreakdownChart from './dashboard/StatusBreakdownChart';
import OnboardingTrendChart from './dashboard/OnboardingTrendChart';
import { ONBOARDING_DASHBOARD } from './dashboard/queries';
import {
  buildKpis,
  countByKind,
  countByStatus,
  monthlyOnboarding,
  MEETING_KINDS,
  MEETING_KINDS_WITHOUT_ECOMM,
} from './dashboard/onboardingStats';

type StatusCardProps = Readonly<{
  to: string;
  title: string;
  chartTitle: string;
  counts: Parameters<typeof StatusBreakdownChart>[0]['counts'];
}>;

/** One "X by status" panel — the whole card opens that entity's list. */
function StatusCard({ to, title, chartTitle, counts }: StatusCardProps) {
  const navigate = useNavigate();
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea onClick={() => navigate(to)} sx={{ height: '100%' }}>
        <CardContent>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              mb: 1
            }}>
            {title}
          </Typography>
          <StatusBreakdownChart title={chartTitle} counts={counts} />
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // E-commerce is a system flag away from being off entirely. With it off the
  // brand segment — its KPI, its status card, its trend series and its meeting
  // tile — is not drawn, and the query does not ask for brands at all.
  const { pending: flagPending, visible: showEcomm } = useProductVisibility();
  const { data, loading, error } = useQuery<any>(ONBOARDING_DASHBOARD, {
    variables: { withEcomm: showEcomm },
    skip: flagPending,
    fetchPolicy: 'cache-and-network',
  });
  const me = data?.me;

  if (flagPending || (loading && !data)) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{parseApiError(error)}</Alert>;
  }

  const firstName = me?.first_name || me?.full_name?.split(' ')[0] || 'there';
  const hosts = data?.hosts ?? [];
  const venues = data?.venues ?? [];
  const brands = data?.ecommBrands ?? [];
  const surveyCount = (data?.surveys ?? []).length;
  const hostCounts = countByStatus(hosts);
  const venueCounts = countByStatus(venues);
  const brandCounts = showEcomm ? countByStatus(brands) : null;
  const kpis = buildKpis(hostCounts, venueCounts, brandCounts, surveyCount);
  const meetings = data?.onboardingMeetings ?? [];
  const meetingCounts = countByKind(meetings);
  const meetingKinds = showEcomm ? MEETING_KINDS : MEETING_KINDS_WITHOUT_ECOMM;
  // Club Admins have no drafted entity — use their approval-meeting timestamp
  // as the "submission" signal so they show up in the trend.
  const clubAdmins = meetings
    .filter((m: { kind?: string | null }) => m.kind === 'CLUB_ADMIN')
    .map((m: { created_at?: string | null }) => ({ submitted_at: m.created_at }));
  const trend = monthlyOnboarding(hosts, venues, brands, clubAdmins);
  // Hosts and venues split the row on their own once brands are hidden.
  const statusWidth = showEcomm ? 4 : 6;

  const widgets: DashboardWidget[] = [
    {
      id: 'kpis',
      bare: true,
      // The KPI grid wraps to two rows below md — fixed h cuts it there.
      fitContent: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
      minH: 2,
      content: <DashboardKpis kpis={kpis} />,
    },
    {
      id: 'meeting-schedule',
      title: t('onboarding.dashboard.meetingSchedule'),
      defaultLayout: { x: 0, y: 2, w: 12, h: 3 },
      minH: 3,
      content: (
        <MeetingScheduleStrip
          counts={meetingCounts}
          kinds={meetingKinds}
          onOpen={(kind) => navigate(`/meetings/${kind.toLowerCase()}?status=REQUESTED`)}
        />
      ),
    },
    {
      id: 'hosts-by-status',
      bare: true,
      defaultLayout: { x: 0, y: 5, w: statusWidth, h: 5 },
      minW: 3,
      minH: 4,
      content: <StatusCard to="/hosts" title={t('onboarding.dashboard.hostsByStatus')} chartTitle="Host" counts={hostCounts} />,
    },
    {
      id: 'venues-by-status',
      bare: true,
      defaultLayout: { x: statusWidth, y: 5, w: statusWidth, h: 5 },
      minW: 3,
      minH: 4,
      content: <StatusCard to="/venues" title={t('onboarding.dashboard.venuesByStatus')} chartTitle="Venue" counts={venueCounts} />,
    },
  ];

  if (brandCounts) {
    widgets.push({
      id: 'brands-by-status',
      bare: true,
      defaultLayout: { x: 8, y: 5, w: 4, h: 5 },
      minW: 3,
      minH: 4,
      content: (
        <StatusCard
          to="/ecomm-brands"
          title={t('onboarding.dashboard.eCommerceBrandsByStatus')}
          chartTitle="Brand"
          counts={brandCounts}
        />
      ),
    });
  }

  widgets.push(
    {
      id: 'onboarding-trend',
      title: t('onboarding.dashboard.onboardingTrendLast6Months'),
      subtitle: t('onboarding.dashboard.hostsVenuesBrandsAndClubAdmins'),
      defaultLayout: { x: 0, y: 10, w: 12, h: 6 },
      minW: 4,
      minH: 4,
      content: <OnboardingTrendChart buckets={trend} showBrands={showEcomm} />,
    },
    {
      id: 'account-summary',
      bare: true,
      // The card does not stretch, so an oversized slot shows as a void.
      fitContent: true,
      defaultLayout: { x: 0, y: 16, w: 12, h: 2 },
      minW: 4,
      // minH floors the MEASURED height too — 3 would pin the void back.
      minH: 2,
      content: <AccountSummaryCard user={me} />,
    },
  );

  return (
    <DuncitDashboard
      dashboardId="onboarding.overview"
      header={
        <DashboardHeader firstName={firstName} photo={me?.profile_photo} roles={me?.roles ?? []} />
      }
      widgets={widgets}
    />
  );
}
