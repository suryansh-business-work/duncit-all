import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogContent, DialogTitle, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { CREATE_PARTNER_POD, PARTNER_PODS_PAGE } from './queries';
import PartnerPodsTable from './PartnerPodsTable';
import { PartnerPodForm, blankPartnerPodForm, buildPartnerPodInput, type PartnerPodFormValues } from './partner-pod';

export default function PartnerPodsPage() {
  const { data, loading, error, refetch } = useQuery(PARTNER_PODS_PAGE, { fetchPolicy: 'cache-and-network' });
  const [createPod, createState] = useMutation(CREATE_PARTNER_POD);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const clubs = data?.clubs ?? [];
  const venues = (data?.myVenues ?? []).filter((venue: any) => venue.status === 'APPROVED' && venue.is_active);
  const products = data?.availablePodProducts ?? [];
  const approvedHost = data?.myHost?.status === 'APPROVED';
  const clubName = (id: string) => clubs.find((club: any) => club.id === id)?.club_name ?? 'Club';
  const venueName = (id?: string | null) => venues.find((venue: any) => venue.id === id)?.venue_name ?? 'Venue';

  const submit = async (values: PartnerPodFormValues, options?: { draft?: boolean }) => {
    setOpError(null);
    try {
      await createPod({ variables: { input: buildPartnerPodInput(values, options?.draft) } });
      setOpen(false);
      setMessage(options?.draft ? 'Pod draft saved.' : 'Pod created.');
      await refetch();
    } catch (submitError: any) {
      setOpError(submitError.message);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box sx={{ p: 2.25, borderRadius: 2, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 900 }}>Partner pods</Typography>
            <Typography variant="h4" fontWeight={950}>Create and manage pods</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 0.75 }}>Use the same pod setup flow as the admin panel.</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} disabled={!approvedHost} onClick={() => setOpen(true)} sx={{ bgcolor: '#fff', color: '#15111c', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}>Add Pod</Button>
        </Stack>
      </Box>
      {!approvedHost && <Alert severity="info">Your host application must be approved before you can create pods.</Alert>}
      {error && <Alert severity="error">{error.message}</Alert>}
      <Card variant="outlined" sx={{ borderRadius: 2 }}><CardContent><PartnerPodsTable loading={loading && !data} pods={data?.myHostPods ?? []} clubName={clubName} venueName={venueName} /></CardContent></Card>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New Pod</DialogTitle>
        <DialogContent dividers>
          <PartnerPodForm initialValues={blankPartnerPodForm} clubs={clubs} venues={venues} products={products} busy={createState.loading} onCancel={() => setOpen(false)} onSubmit={submit} />
          {opError && <Alert severity="error" sx={{ mt: 2 }}>{opError}</Alert>}
        </DialogContent>
      </Dialog>
      <Snackbar open={!!message} autoHideDuration={2500} message={message ?? ''} onClose={() => setMessage(null)} />
    </Stack>
  );
}