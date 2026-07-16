import { useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Alert, Button, Card, CardContent, IconButton, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog } from '@duncit/dialogs';
import { PodEditorDialog, useMediaPickerBridge } from '@duncit/pod-form';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { CLUB_ADMIN_DELETE_POD, CLUB_ADMIN_POD_LOOKUPS, CLUB_ADMIN_PODS_TABLE } from './queries';
import { getClubVenueIds } from '../pods-page/partner-pod-config';
import useClubAdminPodEditor, { CLUB_ADMIN_POD_CONFIG } from './useClubAdminPodEditor';
import PodsTable, { type PodRowBase } from '../../components/PodsTable';

export default function ClubAdminClubPodsPage() {
  const { clubId = '' } = useParams();
  const lookups = useQuery(CLUB_ADMIN_POD_LOOKUPS, { fetchPolicy: 'cache-and-network' });
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [deletePod, deleteState] = useMutation(CLUB_ADMIN_DELETE_POD);

  const [podToDelete, setPodToDelete] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const picker = useMediaPickerBridge();

  const editor = useClubAdminPodEditor({
    clubId,
    onSaved: ({ created, draft }) => {
      if (created) {
        setMessage(draft ? 'Pod draft saved.' : 'Pod created.');
      } else {
        setMessage('Pod updated.');
      }
      refetchRef.current?.();
    },
  });

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

  const confirmDelete = async () => {
    if (!podToDelete) return;
    setDeleteError(null);
    try {
      await deletePod({ variables: { pod_doc_id: podToDelete.id } });
      setPodToDelete(null);
      setMessage('Pod deleted.');
      refetchRef.current?.();
    } catch (error: any) {
      setDeleteError(error.message);
      setPodToDelete(null);
    }
  };

  const renderActions = (pod: PodRowBase) => (
    <Stack direction="row" justifyContent="flex-end" component="span">
      <Tooltip title="Edit pod">
        <IconButton size="small" onClick={() => editor.openEdit(pod)}><EditIcon fontSize="small" /></IconButton>
      </Tooltip>
      <Tooltip title="Delete pod">
        <IconButton size="small" color="error" onClick={() => { setDeleteError(null); setPodToDelete(pod); }}>
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
          {deleteError && <Alert severity="error">{deleteError}</Alert>}
          <PodsTable<PodRowBase>
            tableId="partners-app-club-admin-pods"
            fetchRows={fetchRows}
            refetchRef={refetchRef}
            venueName={venueName}
            emptyText="This club has no pods yet. Create the first one."
            toolbarActions={
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={editor.openCreate}>New Pod</Button>
            }
            renderActions={renderActions}
          />
        </Stack>
      </CardContent>

      <PodEditorDialog
        open={editor.open}
        editing={!!editor.editingPod}
        onClose={editor.close}
        initialValues={editor.initialValues}
        config={CLUB_ADMIN_POD_CONFIG}
        busy={editor.busy}
        error={editor.opError}
        clubs={clubs}
        venues={venues}
        users={editor.hostSeed}
        products={products}
        getClubVenueIds={getClubVenueIds}
        onPickImage={picker.pickImage}
        onPickVideo={picker.pickVideo}
        searchHosts={editor.searchHosts}
        onSubmit={editor.submit}
        intro={
          <Alert severity="info" sx={{ mb: 1.5 }}>
            You are added as the pod host automatically unless you assign hosts below.
          </Alert>
        }
      />

      <MediaPickerDialog
        open={picker.pickerOpen}
        onClose={() => picker.settlePicker(null)}
        onPicked={(url) => picker.settlePicker(url)}
        folder="/pods/media"
        title={picker.title}
        accept={picker.accept}
      />

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
