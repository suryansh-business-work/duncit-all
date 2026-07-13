import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Alert, Button, Card, CardContent, Dialog, DialogContent, DialogTitle, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { PodForm, blankPodFormValues, buildPodInput, podToFormValues, type PodFormValues } from '@duncit/pod-form';
import { CLUB_ADMIN_CREATE_POD, CLUB_ADMIN_DELETE_POD, CLUB_ADMIN_POD_LOOKUPS, CLUB_ADMIN_PODS, CLUB_ADMIN_UPDATE_POD } from './queries';
import { PARTNER_POD_CONFIG, getClubVenueIds } from '../pods-page/partner-pod-config';
import ClubAdminPodsTable from './ClubAdminPodsTable';
import DeletePodDialog from './DeletePodDialog';

export default function ClubAdminClubPodsPage() {
  const { clubId = '' } = useParams();
  const lookups = useQuery(CLUB_ADMIN_POD_LOOKUPS, { fetchPolicy: 'cache-and-network' });
  const podsQuery = useQuery(CLUB_ADMIN_PODS, { variables: { filter: { club_id: clubId } }, fetchPolicy: 'cache-and-network' });
  const [createPod, createState] = useMutation(CLUB_ADMIN_CREATE_POD);
  const [updatePod, updateState] = useMutation(CLUB_ADMIN_UPDATE_POD);
  const [deletePod, deleteState] = useMutation(CLUB_ADMIN_DELETE_POD);

  const [formOpen, setFormOpen] = useState(false);
  const [editPod, setEditPod] = useState<any>(null);
  const [podToDelete, setPodToDelete] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const clubs = lookups.data?.myAdminClubs ?? [];
  const venues = (lookups.data?.myVenues ?? []).filter((venue: any) => venue.status === 'APPROVED' && venue.is_active);
  const products = lookups.data?.availablePodProducts ?? [];
  const club = clubs.find((item: any) => item.id === clubId);
  const venueName = (id?: string | null) => venues.find((venue: any) => venue.id === id)?.venue_name ?? 'Venue';

  const openCreate = () => { setOpError(null); setEditPod(null); setFormOpen(true); };
  const openEdit = (pod: any) => { setOpError(null); setEditPod(pod); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditPod(null); };

  // Memoized so PodForm's reset effect only re-runs when the target pod changes.
  const initialValues: PodFormValues = useMemo(
    () => (editPod ? podToFormValues(editPod) : { ...blankPodFormValues, club_id: clubId }),
    [editPod, clubId]
  );

  const submit = async (values: PodFormValues, options: { draft: boolean }) => {
    setOpError(null);
    const input = buildPodInput({ ...values, club_id: clubId }, { draft: options.draft, config: PARTNER_POD_CONFIG });
    try {
      if (editPod) {
        // UpdatePodInput has no venue_slot_id (slot changes go through the venue flow).
        const updateInput = { ...input };
        delete (updateInput as { venue_slot_id?: unknown }).venue_slot_id;
        await updatePod({ variables: { pod_doc_id: editPod.id, input: updateInput } });
        setMessage('Pod updated.');
      } else {
        await createPod({ variables: { input } });
        setMessage(options.draft ? 'Pod draft saved.' : 'Pod created.');
      }
      closeForm();
      await podsQuery.refetch();
    } catch (submitError: any) {
      setOpError(submitError.message);
    }
  };

  const confirmDelete = async () => {
    if (!podToDelete) return;
    setOpError(null);
    try {
      await deletePod({ variables: { pod_doc_id: podToDelete.id } });
      setPodToDelete(null);
      setMessage('Pod deleted.');
      await podsQuery.refetch();
    } catch (deleteError: any) {
      setOpError(deleteError.message);
      setPodToDelete(null);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5}>
            <Stack spacing={0.25}>
              <Typography variant="overline" color="text.secondary" fontWeight={800}>Club Admin · Pods</Typography>
              <Typography variant="h6" fontWeight={950}>{club?.club_name ?? 'Club pods'}</Typography>
              <Typography variant="body2" color="text.secondary">Create, edit and delete pods for this club.</Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                component={RouterLink}
                to={`/club-admin/clubs/${clubId}/edit`}
              >
                Edit Club Details
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Pod</Button>
            </Stack>
          </Stack>
          {lookups.error && <Alert severity="error">{lookups.error.message}</Alert>}
          {podsQuery.error && <Alert severity="error">{podsQuery.error.message}</Alert>}
          {opError && !formOpen && <Alert severity="error">{opError}</Alert>}
          <ClubAdminPodsTable
            loading={podsQuery.loading && !podsQuery.data}
            pods={podsQuery.data?.pods ?? []}
            venueName={venueName}
            onEdit={openEdit}
            onDelete={(pod) => { setOpError(null); setPodToDelete(pod); }}
          />
        </Stack>
      </CardContent>

      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="md">
        <DialogTitle>{editPod ? 'Edit Pod' : 'New Pod'}</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 1.5 }}>Your approved host profile is added as the pod host automatically.</Alert>
          <PodForm
            initialValues={initialValues}
            config={PARTNER_POD_CONFIG}
            clubs={clubs}
            venues={venues}
            products={products}
            getClubVenueIds={getClubVenueIds}
            busy={createState.loading || updateState.loading}
            error={opError}
            onCancel={closeForm}
            onSubmit={submit}
          />
        </DialogContent>
      </Dialog>

      <DeletePodDialog
        pod={podToDelete}
        busy={deleteState.loading}
        onClose={() => setPodToDelete(null)}
        onConfirm={confirmDelete}
      />

      <Snackbar open={!!message} autoHideDuration={2500} message={message ?? ''} onClose={() => setMessage(null)} />
    </Card>
  );
}
