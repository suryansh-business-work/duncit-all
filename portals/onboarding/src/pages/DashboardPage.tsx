import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Avatar, Box, Card, CardActionArea, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { AccountSummaryCard } from '@duncit/shell';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { appConfig } from '../config/app-config';
import DashboardKpis from './dashboard/DashboardKpis';
import MeetingScheduleStrip from './dashboard/MeetingScheduleStrip';
import StatusBreakdownChart from './dashboard/StatusBreakdownChart';
import OnboardingTrendChart from './dashboard/OnboardingTrendChart';
import { buildKpis, countByKind, countByStatus, monthlyOnboarding } from './dashboard/onboardingStats';
import { useTranslation } from '@duncit/app-settings';

const ONBOARDING_DASHBOARD = gql`
  query OnboardingDashboard {
    me {
      user_id
      full_name
      first_name
      last_name
      email
      phone_number
      phone_extension
      profile_photo
      roles
      created_at
    }
    hosts {
      id
      status
      submitted_at
    }
    venues {
      id
      status
      submitted_at
    }
    ecommBrands {
      id
      status
      submitted_at
    }
    surveys {
      id
    }
    onboardingMeetings {
      id
      kind
      created_at
    }
  }
`;

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
  const { data, loading, error } = useQuery<any>(ONBOARDING_DASHBOARD, { fetchPolicy: 'cache-and-network' });
  const me = data?.me;

  if (loading && !data) {
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
  const brandCounts = countByStatus(brands);
  const kpis = buildKpis(hostCounts, venueCounts, brandCounts, surveyCount);
  const meetings = data?.onboardingMeetings ?? [];
  const meetingCounts = countByKind(meetings);
  // Club Admins have no drafted entity — use their approval-meeting timestamp
  // as the "submission" signal so they show up in the trend.
  const clubAdmins = meetings
    .filter((m: { kind?: string | null }) => m.kind === 'CLUB_ADMIN')
    .map((m: { created_at?: string | null }) => ({ submitted_at: m.created_at }));
  const trend = monthlyOnboarding(hosts, venues, brands, clubAdmins);

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
          onOpen={(kind) => navigate(`/meetings/${kind.toLowerCase()}?status=REQUESTED`)}
        />
      ),
    },
    {
      id: 'hosts-by-status',
      bare: true,
      defaultLayout: { x: 0, y: 5, w: 4, h: 5 },
      minW: 3,
      minH: 4,
      content: <StatusCard to="/hosts" title={t('onboarding.dashboard.hostsByStatus')} chartTitle="Host" counts={hostCounts} />,
    },
    {
      id: 'venues-by-status',
      bare: true,
      defaultLayout: { x: 4, y: 5, w: 4, h: 5 },
      minW: 3,
      minH: 4,
      content: <StatusCard to="/venues" title={t('onboarding.dashboard.venuesByStatus')} chartTitle="Venue" counts={venueCounts} />,
    },
    {
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
    },
    {
      id: 'onboarding-trend',
      title: t('onboarding.dashboard.onboardingTrendLast6Months'),
      subtitle: t('onboarding.dashboard.hostsVenuesBrandsAndClubAdmins'),
      defaultLayout: { x: 0, y: 10, w: 12, h: 6 },
      minW: 4,
      minH: 4,
      content: <OnboardingTrendChart buckets={trend} />,
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
  ];

  return (
    <DuncitDashboard
      dashboardId="onboarding.overview"
      header={
        <Stack direction="row" spacing={1.75} sx={{
          alignItems: "center"
        }}>
          <Avatar
            src={me?.profile_photo || undefined}
            sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontWeight: 800 }}
          >
            {firstName.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{
              fontWeight: 800
            }}>
              Welcome back, {firstName}
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {appConfig.tagline}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
              {(me?.roles ?? []).map((role: string) => (
                <Chip key={role} label={role.replaceAll('_', ' ')} color="primary" variant="outlined" size="small" />
              ))}
            </Stack>
          </Box>
        </Stack>
      }
      widgets={widgets}
    />
  );
}
