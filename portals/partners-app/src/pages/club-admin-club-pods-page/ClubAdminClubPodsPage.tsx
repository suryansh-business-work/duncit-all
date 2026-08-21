import { useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, CardContent, IconButton, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import CreatePodLauncher from './CreatePodLauncher';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog } from '@duncit/dialogs';
import { CLUB_ADMIN_DELETE_POD, CLUB_ADMIN_POD_LOOKUPS, CLUB_ADMIN_PODS_TABLE } from './queries';
import PodActivityDialog from './PodActivityDialog';
import AiMonitorPill from './AiMonitorPill';
import PodStatusFilter from './PodStatusFilter';
import PodsTable, { type PodRowBase } from '../../components/PodsTable';
import type { PodRowStatusFilter } from '../../components/pod-status';

export default function ClubAdminClubPodsPage() {
  const { clubId = '' } = useParams();
  const navigate = useNavigate();
  const lookups = useQuery(CLUB_ADMIN_POD_LOOKUPS, { fetchPolicy: 'cache-and-network' });
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [deletePod, deleteState] = useMutation(CLUB_ADMIN_DELETE_POD);

  // One bucket of the table's Status column, or '' for every status. Derived
  // from four fields server-side, so it is a query argument rather than one of
  // the table's own column filters.
  const [status, setStatus] = useState<PodRowStatusFilter>('');
  const [podToDelete, setPodToDelete] = useState<any>(null);
  const [trailPod, setTrailPod] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const clubs = lookups.data?.myAdminClubs ?? [];
  const venues = (lookups.data?.myVenues ?? []).filter((venue: any) => venue.status === 'APPROVED' && venue.is_active);
  const club = clubs.find((item: any) => item.id === clubId);
  const venueName = (id?: string | null) => venues.find((venue: any) => venue.id === id)?.venue_name ?? 'Venue';
  const podsPath = `/club-admin/clubs/${clubId}/pods`;

  // Every page (and every user filter) stays pinned to this club server-side:
  // clubAdminPodsTable resolves the caller's club membership itself, so no
  // client filter can widen the scope. It also returns every stage — awaiting
  // venue approval and cancelled pods included — so all of them stay editable.
  const fetchRows = useApolloTableFetch<PodRowBase>(
    client,
    CLUB_ADMIN_PODS_TABLE,
    'clubAdminPodsTable',
    { extraVariables: { club_id: clubId, status: status || null } },
    [clubId, status],
  );

  // The status select lives outside the table, so nothing in the table's own
  // query state changes when it does — reload it here (skipping the mount, which
  // the table fetches for itself).
  const statusMounted = useRef(false);
  useEffect(() => {
    if (!statusMounted.current) {
      statusMounted.current = true;
      return;
    }
    refetchRef.current?.();
  }, [status]);

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
      <Tooltip title="Pod details">
        <IconButton size="small" component={RouterLink} to={`${podsPath}/${pod.id}`}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit pod">
        <IconButton size="small" component={RouterLink} to={`${podsPath}/${pod.id}/edit`}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {/* An already-cancelled pod stays editable, but there is nothing left
          to delete. */}
      {!pod.is_deleted && (
        <Tooltip title="Delete pod">
          <IconButton size="small" color="error" onClick={() => { setDeleteError(null); setPodToDelete(pod); }}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
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
              <>
                <PodStatusFilter value={status} onChange={setStatus} />
                <CreatePodLauncher
                  clubId={clubId}
                  club={club ?? null}
                  onNormal={() => navigate(`${podsPath}/new`)}
                />
              </>
            }
            renderActions={renderActions}
            renderMonitor={(pod) => <AiMonitorPill onClick={() => setTrailPod(pod)} />}
          />
        </Stack>
      </CardContent>

      <PodActivityDialog pod={trailPod} onClose={() => setTrailPod(null)} />

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
