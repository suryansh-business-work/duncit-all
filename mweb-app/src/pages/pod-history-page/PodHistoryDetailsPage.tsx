import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BackoutConfirmDialog from '../pod-details-page/BackoutConfirmDialog';
import { notify } from '../../components/notify';
import { parseApiError } from '../../utils/parseApiError';
import PodHistoryDetails from './PodHistoryDetails';
import { BACKOUT_POD_HISTORY, MY_POD_MEMBERSHIPS, type PodHistoryItem } from './queries';

export default function PodHistoryDetailsPage() {
  const { membershipId = '' } = useParams();
  const navigate = useNavigate();
  const [backoutOpen, setBackoutOpen] = useState(false);
  const { data, loading, error, refetch } = useQuery<{ myPodMemberships: PodHistoryItem[] }>(MY_POD_MEMBERSHIPS, {
    fetchPolicy: 'cache-and-network',
  });
  const [backoutPod, backoutState] = useMutation(BACKOUT_POD_HISTORY);
  const items = useMemo(() => data?.myPodMemberships ?? [], [data]);
  const selected = items.find((item) => item.id === membershipId) ?? null;

  const confirmBackout = async () => {
    if (!selected?.pod?.id) return;
    try {
      await backoutPod({ variables: { pod_doc_id: selected.pod.id } });
      notify('Backout request recorded', 'success');
      setBackoutOpen(false);
      await refetch();
    } catch (backoutError) {
      notify(parseApiError(backoutError), 'error');
    }
  };

  if (loading && items.length === 0) return <Stack alignItems="center" sx={{ p: 6 }}><CircularProgress /></Stack>;
  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;
  if (!selected) return <Alert severity="warning">Pod history record not found.</Alert>;

  return (
    <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate('/pod-history')} sx={{ bgcolor: 'action.hover' }} aria-label="Back to pod history">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0 }}>Pod History</Typography>
          <Typography variant="h5" fontWeight={950} sx={{ lineHeight: 1.1 }} noWrap>{selected.pod?.pod_title ?? 'Details'}</Typography>
        </Box>
      </Stack>
      <PodHistoryDetails item={selected} backingOut={backoutState.loading} onBackout={() => setBackoutOpen(true)} />
      <BackoutConfirmDialog open={backoutOpen} onClose={() => setBackoutOpen(false)} busy={backoutState.loading} onConfirm={confirmBackout} />
    </Stack>
  );
}