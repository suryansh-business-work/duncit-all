import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import EarnBox from './EarnBox';
import EarnMeetingActions from './EarnMeetingActions';

const EARN_ME = gql`
  query EarnMe {
    me {
      user_id
      roles
    }
    myMeetings {
      id
      kind
      status
      scheduled_at
      requested_at
      reschedule_count
    }
  }
`;

const BOXES = [
  {
    role: 'HOST',
    kind: 'HOST',
    title: 'By hosting a pod',
    description: 'Run meetups and experiences for your community and earn from paid pods.',
    to: '/survey/host',
    icon: <DashboardIcon />,
  },
  {
    role: 'VENUE_OWNER',
    kind: 'VENUE',
    title: 'By registering your venue',
    description: 'List your space as a Duncit venue and host pods or rent it out.',
    to: '/survey/venue',
    icon: <StorefrontIcon />,
  },
  {
    role: 'ECOMM_MANAGER',
    kind: 'ECOMM',
    title: 'By listing your product',
    description: 'Sell your products to the Duncit community through pods and the shop.',
    to: '/survey/ecomm',
    icon: <Inventory2Icon />,
  },
];

interface EarnMeeting {
  id: string;
  kind: string;
  status: string;
  scheduled_at?: string | null;
  requested_at?: string | null;
  reschedule_count?: number | null;
}

const PENDING = new Set(['REQUESTED', 'SCHEDULED']);

const meetingNotice = (meeting: EarnMeeting) => {
  const at = meeting.scheduled_at ?? meeting.requested_at;
  const when = at
    ? new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  const whenSuffix = when ? ` on ${when}` : '';
  return `You already have an onboarding meeting scheduled for this${whenSuffix}. Our team will meet you then — this option unlocks once the meeting is done.`;
};

/** "Earn with Duncit" — three ways to start earning. A box is disabled when the
 * user already holds the matching role, or while an onboarding meeting for it
 * is still pending. */
export default function EarnPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery(EARN_ME, { fetchPolicy: 'cache-and-network' });
  const roles: string[] = data?.me?.roles ?? [];
  const meetings: EarnMeeting[] = data?.myMeetings ?? [];
  const showSkeleton = loading && !data;

  return (
    <Stack
      spacing={2}
      sx={{ maxWidth: 720, mx: 'auto', width: '100%', p: { xs: 1.5, sm: 2 }, pb: { xs: 10, sm: 8 } }}
    >
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} size="small">
          Back
        </Button>
      </Box>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 950 }}>
          Earn with Duncit
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
          Pick a way to start earning on Duncit.
        </Typography>
      </Stack>
      <Stack spacing={1.5}>
        {showSkeleton
          ? BOXES.map((box) => (
              <Skeleton key={box.role} variant="rounded" height={104} sx={{ borderRadius: 3 }} />
            ))
          : null}
        {showSkeleton ? null : BOXES.map((box) => {
          const hasRole = roles.includes(box.role);
          const pendingMeeting = meetings.find(
            (m) => m.kind === box.kind && PENDING.has(m.status)
          );
          const showMeetingNotice = !hasRole && !!pendingMeeting;
          return (
            <Stack key={box.role} spacing={0}>
              <EarnBox
                icon={box.icon}
                title={box.title}
                description={showMeetingNotice ? meetingNotice(pendingMeeting) : box.description}
                to={box.to}
                disabled={hasRole || showMeetingNotice}
                disabledLabel={showMeetingNotice ? 'Meeting scheduled' : 'Already enabled'}
              />
              {showMeetingNotice && (
                <EarnMeetingActions
                  kind={box.kind}
                  bookedAt={pendingMeeting.scheduled_at ?? pendingMeeting.requested_at ?? null}
                  rescheduleCount={pendingMeeting.reschedule_count ?? 0}
                  onChanged={() => void refetch()}
                />
              )}
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}
