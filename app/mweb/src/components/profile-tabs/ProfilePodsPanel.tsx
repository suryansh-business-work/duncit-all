import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import PodCard from '../../pages/home-page/PodCard';
import { useTranslation } from '../../i18n/useTranslation';
import { openPod } from '../../lib/open-pod';
import { USER_HOSTED_PODS, USER_JOINED_PODS } from './queries';

export type ProfilePodsKind = 'joined' | 'hosted';

interface Props {
  userId: string;
  kind: ProfilePodsKind;
}

/**
 * A profile tab's pods — the ones this member joined, or the ones they host —
 * as the same cards the home feed shows, each opening its pod.
 * Twin of native `ProfilePodsPanel` (rule 27).
 */
export default function ProfilePodsPanel({ userId, kind }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<any>(kind === 'joined' ? USER_JOINED_PODS : USER_HOSTED_PODS, {
    variables: { user_id: userId },
    fetchPolicy: 'cache-and-network',
  });
  const pods: any[] = (kind === 'joined' ? data?.userJoinedPods : data?.pods) ?? [];

  if (loading && !data) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }} data-testid={`profile-pods-${kind}-loading`}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{t('mweb.profile.podsLoadFailed')}</Alert>;
  if (pods.length === 0) {
    return (
      <Typography
        variant="body2"
        data-testid={`profile-pods-${kind}-empty`}
        sx={{ color: 'text.secondary', textAlign: 'center', py: 5, fontWeight: 500 }}
      >
        {kind === 'joined' ? t('mweb.profile.noJoinedPods') : t('mweb.profile.noHostedPods')}
      </Typography>
    );
  }
  return (
    <Box
      data-testid={`profile-pods-${kind}`}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))',
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
  );
}
