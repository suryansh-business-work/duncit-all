import { useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Alert, Button, Card, CardContent, Dialog, DialogContent, DialogTitle, IconButton, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog } from '@duncit/dialogs';
import { PodForm, blankPodFormValues, buildPodInput, podToFormValues, type PodFormValues } from '@duncit/pod-form';
import { CLUB_ADMIN_CREATE_POD, CLUB_ADMIN_DELETE_POD, CLUB_ADMIN_POD_LOOKUPS, CLUB_ADMIN_PODS_TABLE, CLUB_ADMIN_UPDATE_POD } from './queries';
import { PARTNER_POD_CONFIG, getClubVenueIds } from '../pods-page/partner-pod-config';
import PodsTable, { type PodRowBase } from '../../components/PodsTable';

export default function ClubAdminClubPodsPage() {
  const { clubId = '' } = useParams();
  const lookups = useQuery(CLUB_ADMIN_POD_LOOKUPS, { fetchPolicy: 'cache-and-network' });
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
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

  // Every page (and every user filter) stays pinned to this club server-side.
  const fetchRows = useApolloTableFetch<PodRowBase>(
    client,
    CLUB_ADMIN_PODS_TABLE,
    'podsTable',
    { extraFilters: [{ field: 'club_id', op: 'eq', value: clubId }] },
    [clubId],
  );

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
      refetchRef.current?.();
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
      refetchRef.current?.();
    } catch (deleteError: any) {
      setOpError(deleteError.message);
      setPodToDelete(null);
    }
  };

  const renderActions = (pod: PodRowBase) => (
    <Stack direction="row" justifyContent="flex-end" component="span">
      <Tooltip title="Edit pod">
        <IconButton size="small" onClick={() => openEdit(pod)}><EditIcon fontSize="small" /></IconButton>
      </Tooltip>
      <Tooltip title="Delete pod">
        <IconButton size="small" color="error" onClick={() => { setOpError(null); setPodToDelete(pod); }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

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
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              component={RouterLink}
              to={`/club-admin/clubs/${clubId}/edit`}
            >
              Edit Club Details
            </Button>
          </Stack>
          {lookups.error && <Alert severity="error">{lookups.error.message}</Alert>}
          {opError && !formOpen && <Alert severity="error">{opError}</Alert>}
          <PodsTable<PodRowBase>
            tableId="partners-app-club-admin-pods"
            fetchRows={fetchRows}
            refetchRef={refetchRef}
            venueName={venueName}
            emptyText="This club has no pods yet. Create the first one."
            toolbarActions={
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Pod</Button>
            }
            renderActions={renderActions}
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

      <ConfirmDialog
        open={!!podToDelete}
        title="Delete pod?"
        message={
          <>
            This will remove <strong>{podToDelete?.pod_title}</strong> from the club. Members lose
            access to it. This cannot be undone.
          </>
        }
        destructive
        busy={deleteState.loading}
        busyLabel="Deleting..."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setPodToDelete(null)}
      />

      <Snackbar open={!!message} autoHideDuration={2500} message={message ?? ''} onClose={() => setMessage(null)} />
    </Card>
  );
}
