import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { nothingUpcoming } from '@duncit/utils';
import PodCard from '../../pages/home-page/PodCard';
import { useTranslation } from '../../i18n/useTranslation';
import { openPod } from '../../lib/open-pod';
import { RequestEventCard } from '../event-request';
import { USER_HOSTED_PODS, USER_JOINED_PODS } from './queries';

export type ProfilePodsKind = 'joined' | 'hosted';

interface Props {
  userId: string;
  kind: ProfilePodsKind;
  /** The host's name, on SOMEONE ELSE's hosted tab: with nothing coming up,
   * the viewer may request an event. Absent on the owner's own profile. */
  requestFromHost?: string;
}

/**
 * A profile tab's pods — the ones this member joined, or the ones they host —
 * as the same cards the home feed shows, each opening its pod. A host with
 * nothing coming up offers the viewer "Request an event" under them.
 * Twin of native `ProfilePodsPanel` (rule 27).
 */
export default function ProfilePodsPanel({ userId, kind, requestFromHost }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<any>(kind === 'joined' ? USER_JOINED_PODS : USER_HOSTED_PODS, {
    variables: { user_id: userId },
    fetchPolicy: 'cache-and-network',
  });
  const pods: any[] = (kind === 'joined' ? data?.userJoinedPods : data?.pods) ?? [];
  const request =
    kind === 'hosted' && requestFromHost !== undefined && nothingUpcoming(pods) ? (
      <RequestEventCard targetType="HOST" targetId={userId} targetName={requestFromHost} />
    ) : null;

  if (loading && !data) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }} data-testid={`profile-pods-${kind}-loading`}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{t('mweb.profile.podsLoadFailed')}</Alert>;
  if (pods.length === 0) {
    return (
      <Stack spacing={1}>
        <Typography
          variant="body2"
          data-testid={`profile-pods-${kind}-empty`}
          sx={{ color: 'text.secondary', textAlign: 'center', py: 5, fontWeight: 500 }}
        >
          {kind === 'joined' ? t('mweb.profile.noJoinedPods') : t('mweb.profile.noHostedPods')}
        </Typography>
        {request}
      </Stack>
    );
  }
  return (
    <Stack spacing={2}>
      <Box
        data-testid={`profile-pods-${kind}`}
        sx={{
          display: 'grid',
          // `min(…, 100%)` keeps a lone column inside a container narrower
          // than the card, so the grid never overflows the profile.
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(268px, 100%), 1fr))',
          minWidth: 0,
          justifyItems: 'center',
          gap: 1.5,
        }}
      >
        {pods.map((pod) => (
          <PodCard
            key={pod.id}
            pod={pod}
            hostName={pod.host_names?.[0] ?? null}
            onOpen={() => openPod(navigate, pod)}
          />
        ))}
      </Box>
      {request}
    </Stack>
  );
}
