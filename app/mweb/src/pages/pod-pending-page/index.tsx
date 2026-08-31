import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { useParams } from 'react-router';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import PullToRefreshIndicator from '../../components/PullToRefreshIndicator';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useTranslation } from '../../i18n/useTranslation';
import ClubAdminCard from './ClubAdminCard';
import PendingBanner from './PendingBanner';
import PodPendingHeader from './PodPendingHeader';
import PodPendingSummaryCard from './PodPendingSummaryCard';
import VenuePendingCard from './VenuePendingCard';
import { HOST_POD_PENDING_VIEW, type PodPendingView } from './queries';

/** Waiting page a host lands on after creating a pod whose venue slot request is
 * PENDING — banner + pod summary + venue contact + club-admin help cards.
 *
 * The venue's answer arrives outside this page, so it carries both ways to ask
 * again: the header's refresh button and a pull-down over the content. Once the
 * slot is approved the amber badge and banner turn green on the next refetch.
 * mWeb twin of the native PodPendingScreen (rule 27). */
export default function PodPendingPage() {
  const { t } = useTranslation();
  const { podId } = useParams<{ podId: string }>();
  const { data, loading, error, refetch } = useQuery<any>(HOST_POD_PENDING_VIEW, {
    variables: { pod_doc_id: podId },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
  });
  const view: PodPendingView | undefined = data?.hostPodPendingView;
  const { anchorRef, pull, refreshing, refresh } = usePullToRefresh(refetch);

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
        <PendingBanner status={view.pod.venue_approval_status} />
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
      ref={anchorRef}
      spacing={1.75}
      data-testid="pod-pending-page"
      sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 720, mx: 'auto', minHeight: '100%' }}
    >
      <PodPendingHeader refreshing={refreshing} onRefresh={refresh} />
      <PullToRefreshIndicator
        pull={pull}
        refreshing={refreshing}
        label={t('mweb.podPending.refresh')}
      />
      {body}
    </Stack>
  );
}
