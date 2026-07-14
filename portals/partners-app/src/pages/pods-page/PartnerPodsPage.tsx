import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogContent, DialogTitle, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { PodForm, blankPodFormValues, buildPodInput, type PodFormValues } from '@duncit/pod-form';
import PodsTable from '../../components/PodsTable';
import { CREATE_PARTNER_POD, MY_HOST_PODS_TABLE, PARTNER_POD_LOOKUPS, type PartnerPodRow } from './queries';
import { PARTNER_POD_CONFIG, getClubVenueIds } from './partner-pod-config';

export default function PartnerPodsPage() {
  const { data, error } = useQuery(PARTNER_POD_LOOKUPS, { fetchPolicy: 'cache-and-network' });
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
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

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data: page } = await client.query({
        query: MY_HOST_PODS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: page.myHostPodsTable.rows as PartnerPodRow[],
        total: page.myHostPodsTable.total as number,
      };
    },
    [client],
  );

  const submit = async (values: PodFormValues, options: { draft: boolean }) => {
    setOpError(null);
    try {
      await createPod({ variables: { input: buildPodInput(values, { draft: options.draft, config: PARTNER_POD_CONFIG }) } });
      setOpen(false);
      setMessage(options.draft ? 'Pod draft saved.' : 'Pod created.');
      refetchRef.current?.();
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
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <PodsTable<PartnerPodRow>
            tableId="partners-app-partner-pods"
            fetchRows={fetchRows}
            refetchRef={refetchRef}
            clubName={clubName}
            venueName={venueName}
            emptyText="No pods created from your partner account yet."
          />
        </CardContent>
      </Card>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New Pod</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 1.5 }}>Your approved host profile is added as the pod host automatically.</Alert>
          <PodForm
            initialValues={blankPodFormValues}
            config={PARTNER_POD_CONFIG}
            clubs={clubs}
            venues={venues}
            products={products}
            getClubVenueIds={getClubVenueIds}
            busy={createState.loading}
            error={opError}
            onCancel={() => setOpen(false)}
            onSubmit={submit}
          />
        </DialogContent>
      </Dialog>
      <Snackbar open={!!message} autoHideDuration={2500} message={message ?? ''} onClose={() => setMessage(null)} />
    </Stack>
  );
}
