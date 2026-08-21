import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import ClubAdminCard from './ClubAdminCard';
import PendingBanner from './PendingBanner';
import PodPendingSummaryCard from './PodPendingSummaryCard';
import VenuePendingCard from './VenuePendingCard';
import { HOST_POD_PENDING_VIEW, type PodPendingView } from './queries';

/** Waiting page a host lands on after creating a pod whose venue slot request is
 * PENDING — banner + pod summary + venue contact + club-admin help cards.
 * mWeb twin of the native PodPendingScreen (rule 27). */
export default function PodPendingPage() {
  const { t } = useTranslation();
  const { podId } = useParams<{ podId: string }>();
  const { data, loading, error } = useQuery(HOST_POD_PENDING_VIEW, {
    variables: { pod_doc_id: podId },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
  });
  const view: PodPendingView | undefined = data?.hostPodPendingView;

  let body: ReactNode;
  if (loading && !view) {
    body = (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }} data-testid="pod-pending-loading">
        <CircularProgress />
      </Box>
    );
  } else if (error || !view) {
    body = (
      <Alert severity="error" data-testid="pod-pending-error">
        {error?.message ?? t('mweb.podPending.loadFailed')}
      </Alert>
    );
  } else {
    body = (
      <>
        <PendingBanner />
        <PodPendingSummaryCard view={view} />
        {view.venue && (
          <VenuePendingCard venue={view.venue} status={view.pod.venue_approval_status} />
        )}
        {view.club_admin && <ClubAdminCard admin={view.club_admin} />}
      </>
    );
  }

  return (
    <Stack
      spacing={1.75}
      data-testid="pod-pending-page"
      sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 720, mx: 'auto', minHeight: '100%' }}
    >
      {body}
    </Stack>
  );
}
