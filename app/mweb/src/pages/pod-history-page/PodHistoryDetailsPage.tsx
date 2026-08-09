import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BackoutConfirmDialog from '../pod-details-page/BackoutConfirmDialog';
import RejoinConfirmDialog from './RejoinConfirmDialog';
import { notify } from '../../components/notify';
import { parseApiError } from '../../utils/parseApiError';
import { useTranslation } from '../../i18n/useTranslation';
import PodHistoryDetails from './PodHistoryDetails';
import { BACKOUT_POD_HISTORY, MY_POD_MEMBERSHIPS, REJOIN_POD, type PodHistoryItem } from './queries';

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

  const confirmBackout = async (seats?: number) => {
    if (!selected?.pod?.id) return;
    try {
      await backoutPod({ variables: { pod_doc_id: selected.pod.id, seats: seats ?? null } });
      notify(t('mweb.podHistory.backoutRecorded'), 'success');
      setBackoutOpen(false);
      await refetch();
    } catch (backoutError) {
      notify(parseApiError(backoutError), 'error');
    }
  };

  const confirmRejoin = async () => {
    if (!selected?.pod?.id) return;
    try {
      await rejoinPod({ variables: { pod_doc_id: selected.pod.id } });
      notify(t('mweb.podHistory.rejoinedSuccess'), 'success');
      setRejoinOpen(false);
      await refetch();
    } catch (rejoinError) {
      notify(parseApiError(rejoinError), 'error');
    }
  };

  if (loading && items.length === 0) return <Stack alignItems="center" sx={{ p: 6 }}><CircularProgress /></Stack>;
  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;
  if (!selected) return <Alert severity="warning">{t('mweb.podHistory.notFound')}</Alert>;

  return (
    <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate('/pod-history')} sx={{ bgcolor: 'action.hover' }} aria-label={t('mweb.podHistory.backToPodHistory')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0 }}>{t('mweb.podHistory.title')}</Typography>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.1 }} noWrap>{selected.pod?.pod_title ?? t('mweb.podHistory.podDetailsTitle')}</Typography>
        </Box>
      </Stack>
      <PodHistoryDetails
        item={selected}
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