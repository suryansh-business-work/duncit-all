import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import GroupsIcon from '@mui/icons-material/Groups';
import {
  EARN_JOURNEYS,
  earnBoxState,
  partnerPortalUrl,
  type EarnJourney,
  type EarnJourneyCta,
  type EarnMeeting,
} from '@duncit/onboarding';
import EarnBox from './EarnBox';
import EarnMeetingActions from './EarnMeetingActions';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

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

// Journeys, copy and the locked/unlocked rules are shared with native and the
// partner portal so the three cannot drift (they already had).
const ICONS: Record<EarnJourney['iconKey'], JSX.Element> = {
  host: <DashboardIcon />,
  venue: <StorefrontIcon />,
  ecomm: <Inventory2Icon />,
  club: <GroupsIcon />,
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
  // The product-seller path is hidden when products are gated off — mirrors the
  // native EarnScreen so all three platforms behave identically.
  const showProducts = useFeatureFlag('is_product_visible');
  const boxes = showProducts ? EARN_JOURNEYS : EARN_JOURNEYS.filter((box) => box.kind !== 'ECOMM');

  // Approved-user next step: an in-app route (host) or the Partner Portal
  // (venue/ecomm/club — opening the deep link there preserves it through login).
  const runCta = (cta: EarnJourneyCta) => {
    if (cta.target === 'internal') {
      navigate(cta.internalTo);
      return;
    }
    globalThis.window.location.replace(partnerPortalUrl(cta.partnerPath));
  };

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
          ? boxes.map((box) => (
              <Skeleton key={box.role} variant="rounded" height={104} sx={{ borderRadius: 3 }} />
            ))
          : null}
        {showSkeleton ? null : boxes.map((box) => {
          const state = earnBoxState(box, roles, meetings);
          const { scheduledMeeting } = state;
          const cta = state.approved
            ? { label: box.cta.label, onClick: () => runCta(box.cta) }
            : undefined;
          return (
            <Stack key={box.role} spacing={0}>
              <EarnBox
                icon={ICONS[box.iconKey]}
                title={box.title}
                description={state.description}
                to={box.surveyPath}
                disabled={state.disabled}
                disabledLabel={state.disabledLabel}
                cta={cta}
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
