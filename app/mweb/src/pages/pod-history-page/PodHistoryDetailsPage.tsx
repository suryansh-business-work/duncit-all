import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { isBackoutMaxed } from '@duncit/utils';
import { Alert, Box, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BackoutConfirmDialog from '../pod-details-page/BackoutConfirmDialog';
import RejoinConfirmDialog from './RejoinConfirmDialog';
import { notify } from '../../components/notify';
import { parseApiError } from '../../utils/parseApiError';
import { useTranslation } from '../../i18n/useTranslation';
import PodHistoryDetails from './PodHistoryDetails';
import {
  BACKOUT_POD_HISTORY,
  MY_POD_MEMBERSHIPS,
  POD_HISTORY_BACKOUT_STATE,
  REJOIN_POD,
  type PodHistoryItem,
} from './queries';

export default function PodHistoryDetailsPage() {
  const { membershipId = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [backoutOpen, setBackoutOpen] = useState(false);
  const [rejoinOpen, setRejoinOpen] = useState(false);
  const { data, loading, error, refetch } = useQuery<{ myPodMemberships: PodHistoryItem[] }>(MY_POD_MEMBERSHIPS, {
    fetchPolicy: 'cache-and-network',
  });
  const [backoutPod, backoutState] = useMutation(BACKOUT_POD_HISTORY);
  const [rejoinPod, rejoinState] = useMutation(REJOIN_POD);
  const items = useMemo(() => data?.myPodMemberships ?? [], [data]);
  const selected = items.find((item) => item.id === membershipId) ?? null;
  // Attempts left, from the state the backout mutation itself guards on — the
  // button was offered on a pod that had none, and every press of it failed.
  const { data: stateData, refetch: refetchState } = useQuery(POD_HISTORY_BACKOUT_STATE, {
    variables: { pod_doc_id: selected?.pod?.id ?? '' },
    skip: !selected?.pod?.id,
    fetchPolicy: 'cache-and-network',
  });
  const backoutMaxed = isBackoutMaxed(stateData?.podMembershipState);

  /*
    Both reads, every time — a backout changes the booking AND the attempts.

    Refetching only the memberships left the seat count and the timeline fresh
    beside an attempt counter frozen at what it was before the request, so the
    page had to be reloaded before it agreed with itself.
  */
  const refresh = async () => {
    await Promise.all([refetch(), refetchState()]).catch(() => undefined);
  };

  const confirmBackout = async (seats?: number) => {
    if (!selected?.pod?.id) return;
    try {
      await backoutPod({ variables: { pod_doc_id: selected.pod.id, seats: seats ?? null } });
      notify(t('mweb.podHistory.backoutRecorded'), 'success');
      setBackoutOpen(false);
    } catch (backoutError) {
      notify(parseApiError(backoutError), 'error');
    }
    // Either way: a refusal is decided against server-side state (the attempt
    // limit), so the page re-reads rather than keeping the copy it guessed on.
    await refresh();
  };

  const confirmRejoin = async () => {
    if (!selected?.pod?.id) return;
    try {
      await rejoinPod({ variables: { pod_doc_id: selected.pod.id } });
      notify(t('mweb.podHistory.rejoinedSuccess'), 'success');
      setRejoinOpen(false);
      await refresh();
    } catch (rejoinError) {
      notify(parseApiError(rejoinError), 'error');
    }
  };

  if (loading && items.length === 0) return (
    <Stack
      sx={{
        alignItems: "center",
        p: 6
      }}><CircularProgress /></Stack>
  );
  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;
  if (!selected) return <Alert severity="warning">{t('mweb.podHistory.notFound')}</Alert>;

  return (
    <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto' }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <IconButton size="small" onClick={() => navigate('/pod-history')} sx={{ bgcolor: 'action.hover' }} aria-label={t('mweb.podHistory.backToPodHistory')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              letterSpacing: 0
            }}>{t('mweb.podHistory.title')}</Typography>
          <Typography
            variant="h5"
            noWrap
            sx={{
              fontWeight: 700,
              lineHeight: 1.1
            }}>{selected.pod?.pod_title ?? t('mweb.podHistory.podDetailsTitle')}</Typography>
        </Box>
      </Stack>
      <PodHistoryDetails
        item={selected}
        backoutMaxed={backoutMaxed}
        backingOut={backoutState.loading}
        rejoining={rejoinState.loading}
        onBackout={() => setBackoutOpen(true)}
        onRejoin={() => setRejoinOpen(true)}
      />
      <BackoutConfirmDialog open={backoutOpen} onClose={() => setBackoutOpen(false)} busy={backoutState.loading} mySeats={selected?.seats ?? 1} onConfirm={confirmBackout} />
      <RejoinConfirmDialog open={rejoinOpen} onClose={() => setRejoinOpen(false)} busy={rejoinState.loading} onConfirm={confirmRejoin} />
    </Stack>
  );
}