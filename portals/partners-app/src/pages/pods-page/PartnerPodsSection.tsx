import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Card, CardContent, Dialog, DialogContent, DialogTitle, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { CREATE_PARTNER_POD, PARTNER_PODS_PAGE } from './queries';
import PartnerPodsTable from './PartnerPodsTable';
import { PartnerPodForm, blankPartnerPodForm, buildPartnerPodInput, type PartnerPodFormValues } from './partner-pod';

export default function PartnerPodsSection() {
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
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5}>
            <Stack spacing={0.25}>
              <Typography variant="h6" fontWeight={950}>Pods</Typography>
              <Typography variant="body2" color="text.secondary">Create and manage pods from your approved host profile.</Typography>
            </Stack>
            <Button variant="contained" startIcon={<AddIcon />} disabled={!approvedHost} onClick={() => setOpen(true)}>New Pod</Button>
          </Stack>
          {!approvedHost && <Alert severity="info">Host approval is required before creating pods.</Alert>}
          {error && <Alert severity="error">{error.message}</Alert>}
          <PartnerPodsTable loading={loading && !data} pods={data?.myHostPods ?? []} clubName={clubName} venueName={venueName} />
        </Stack>
      </CardContent>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New Pod</DialogTitle>
        <DialogContent dividers>
          <PartnerPodForm initialValues={blankPartnerPodForm} clubs={clubs} venues={venues} products={products} busy={createState.loading} onCancel={() => setOpen(false)} onSubmit={submit} />
          {opError && <Alert severity="error" sx={{ mt: 2 }}>{opError}</Alert>}
        </DialogContent>
      </Dialog>
      <Snackbar open={!!message} autoHideDuration={2500} message={message ?? ''} onClose={() => setMessage(null)} />
    </Card>
  );
}