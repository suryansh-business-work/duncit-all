import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import GroupsIcon from '@mui/icons-material/Groups';
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
      request_no
      kind
      status
      approval_status
      onboarded_status
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
  {
    role: 'CLUB_ADMIN',
    kind: 'CLUB_ADMIN',
    title: 'By managing a club',
    description: 'Run a Duncit club and manage its pods and members as a club admin.',
    to: '/survey/club_admin',
    icon: <GroupsIcon />,
  },
];

interface EarnMeeting {
  id: string;
  request_no?: string | null;
  kind: string;
  status: string;
  approval_status?: string | null;
  onboarded_status?: string | null;
  scheduled_at?: string | null;
  requested_at?: string | null;
  reschedule_count?: number | null;
}

interface EarnBoxDef {
  role: string;
  kind: string;
  title: string;
  description: string;
  to: string;
  icon: JSX.Element;
}

const PENDING = new Set(['REQUESTED', 'SCHEDULED']);
// A DONE meeting still at NONE/PENDING approval = onboarding under way; the card
// stays blocked until an admin approves (or denies) the post-meeting feedback.
const APPROVAL_IN_PROGRESS = new Set(['NONE', 'PENDING']);
const IN_PROCESS_LABEL = 'Onboarding in process.';
// Meeting approved but the onboarded record is still under review (Draft/
// Submitted) → the option stays locked (Item 2); a Rejected record re-opens it.
const ONBOARDED_UNDER_REVIEW = new Set(['DRAFT', 'SUBMITTED']);

const meetingNotice = (meeting: EarnMeeting) => {
  const at = meeting.scheduled_at ?? meeting.requested_at;
  const when = at
    ? new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  const whenSuffix = when ? ` on ${when}` : '';
  const ref = meeting.request_no ? ` (Request ID: ${meeting.request_no})` : '';
  return `You already have an onboarding meeting${ref} scheduled for this${whenSuffix}. Our team will meet you then — this option unlocks once the meeting is done.`;
};

interface EarnBoxState {
  disabled: boolean;
  disabledLabel: string;
  description: string;
  scheduledMeeting?: EarnMeeting;
}

/** Resolve a card's locked/unlocked state — mirrors the native EarnScreen. */
const earnBoxState = (
  box: EarnBoxDef,
  roles: readonly string[],
  meetings: readonly EarnMeeting[],
): EarnBoxState => {
  if (roles.includes(box.role)) {
    return { disabled: true, disabledLabel: 'Already enabled', description: box.description };
  }
  const meeting = meetings.find((m) => m.kind === box.kind);
  if (meeting && PENDING.has(meeting.status)) {
    return {
      disabled: true,
      disabledLabel: 'Meeting scheduled',
      description: meetingNotice(meeting),
      scheduledMeeting: meeting,
    };
  }
  if (meeting?.status === 'DONE' && APPROVAL_IN_PROGRESS.has(meeting.approval_status ?? 'NONE')) {
    return {
      disabled: true,
      disabledLabel: IN_PROCESS_LABEL,
      description: `${IN_PROCESS_LABEL} Our team is reviewing your application.`,
    };
  }
  if (
    meeting?.status === 'DONE' &&
    meeting.approval_status === 'APPROVED' &&
    ONBOARDED_UNDER_REVIEW.has(meeting.onboarded_status ?? '')
  ) {
    return {
      disabled: true,
      disabledLabel: IN_PROCESS_LABEL,
      description: `${IN_PROCESS_LABEL} Our team is reviewing your application.`,
    };
  }
  return { disabled: false, disabledLabel: 'Already enabled', description: box.description };
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
          const state = earnBoxState(box, roles, meetings);
          const { scheduledMeeting } = state;
          return (
            <Stack key={box.role} spacing={0}>
              <EarnBox
                icon={box.icon}
                title={box.title}
                description={state.description}
                to={box.to}
                disabled={state.disabled}
                disabledLabel={state.disabledLabel}
              />
              {scheduledMeeting && (
                <EarnMeetingActions
                  kind={box.kind}
                  bookedAt={scheduledMeeting.scheduled_at ?? scheduledMeeting.requested_at ?? null}
                  rescheduleCount={scheduledMeeting.reschedule_count ?? 0}
                  onChanged={() => {
                    refetch().catch(() => undefined);
                  }}
                />
              )}
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}
