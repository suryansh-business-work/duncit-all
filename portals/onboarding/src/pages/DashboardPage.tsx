import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Avatar, Box, Card, CardActionArea, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { AccountSummaryCard } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import DashboardKpis from './dashboard/DashboardKpis';
import MeetingScheduleStrip from './dashboard/MeetingScheduleStrip';
import StatusBreakdownChart from './dashboard/StatusBreakdownChart';
import OnboardingTrendChart from './dashboard/OnboardingTrendChart';
import { buildKpis, countByKind, countByStatus, monthlyOnboarding } from './dashboard/onboardingStats';

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

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(ONBOARDING_DASHBOARD, { fetchPolicy: 'cache-and-network' });
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

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1.75}>
        <Avatar
          src={me?.profile_photo || undefined}
          sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontWeight: 800 }}
        >
          {firstName.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Welcome back, {firstName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {appConfig.tagline}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
            {(me?.roles ?? []).map((role: string) => (
              <Chip key={role} label={role.replaceAll('_', ' ')} color="primary" variant="outlined" size="small" />
            ))}
          </Stack>
        </Box>
      </Stack>

      <DashboardKpis kpis={kpis} />

      <Box>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
          Meeting schedule
        </Typography>
        <MeetingScheduleStrip counts={meetingCounts} onOpen={() => navigate('/meetings/calendar')} />
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardActionArea onClick={() => navigate('/hosts')} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                Hosts by status
              </Typography>
              <StatusBreakdownChart title="Host" counts={hostCounts} />
            </CardContent>
          </CardActionArea>
        </Card>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardActionArea onClick={() => navigate('/venues')} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                Venues by status
              </Typography>
              <StatusBreakdownChart title="Venue" counts={venueCounts} />
            </CardContent>
          </CardActionArea>
        </Card>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardActionArea onClick={() => navigate('/ecomm-brands')} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                E-Commerce brands by status
              </Typography>
              <StatusBreakdownChart title="Brand" counts={brandCounts} />
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
            Onboarding trend (last 6 months)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Hosts, Venues, Brands and Club Admins by month.
          </Typography>
          <OnboardingTrendChart buckets={trend} />
        </CardContent>
      </Card>

      <AccountSummaryCard user={me} />
    </Stack>
  );
}
