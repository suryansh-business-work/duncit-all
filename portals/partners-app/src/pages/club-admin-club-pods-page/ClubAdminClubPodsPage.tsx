import { useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import { Alert, Card, CardContent, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import CreatePodLauncher from './CreatePodLauncher';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog } from '@duncit/dialogs';
import { CLUB_ADMIN_DELETE_POD, CLUB_ADMIN_POD_LOOKUPS, CLUB_ADMIN_PODS_TABLE } from '@duncit/pod-form';
import PodActivityDialog from './PodActivityDialog';
import AiMonitorPill from './AiMonitorPill';
import PodStatusFilter from './PodStatusFilter';
import PodsTable, { type PodRowBase } from '../../components/PodsTable';
import { canOpenPodAttendance, type PodRowStatusFilter } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

export default function ClubAdminClubPodsPage() {
  const { t } = useTranslation();
  const { clubId = '' } = useParams();
  const navigate = useNavigate();
  const lookups = useQuery<any>(CLUB_ADMIN_POD_LOOKUPS, { fetchPolicy: 'cache-and-network' });
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [deletePod, deleteState] = useMutation<any>(CLUB_ADMIN_DELETE_POD);

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
      setMessage(t('clubAdmin.pods.podDeleted'));
      refetchRef.current?.();
    } catch (error: any) {
      setDeleteError(error.message);
      setPodToDelete(null);
    }
  };

  const renderActions = (pod: PodRowBase) => (
    <Stack direction="row" component="span" sx={{
      justifyContent: "flex-end"
    }}>
      <Tooltip title={t('clubAdmin.pods.podDetails')}>
        <DuncitIconButton size="small" component={RouterLink} to={`${podsPath}/${pod.id}`}>
          <VisibilityIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      {canOpenPodAttendance(pod) && (
        <Tooltip title={t('clubAdmin.pods.podAttendance')}>
          <DuncitIconButton
            size="small"
            color="success"
            component={RouterLink}
            to={`${podsPath}/${pod.id}/attendance`}
          >
            <CheckCircleOutlinedIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      )}
      <Tooltip title={t('clubAdmin.pods.editPod')}>
        <DuncitIconButton size="small" component={RouterLink} to={`${podsPath}/${pod.id}/edit`}>
          <EditIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      {/* An already-cancelled pod stays editable, but there is nothing left
          to delete. */}
      {!pod.is_deleted && (
        <Tooltip title={t('clubAdmin.pods.deletePod')}>
          <DuncitIconButton size="small" color="error" onClick={() => { setDeleteError(null); setPodToDelete(pod); }}>
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      )}
    </Stack>
  );

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: 'flex-start', sm: 'center' }
            }}>
            <Stack spacing={0.25}>
              <Typography
                variant="overline"
                sx={{
                  color: "text.secondary",
                  fontWeight: 800
                }}>{t('clubAdmin.pods.title')}</Typography>
              <Typography variant="h6" sx={{
                fontWeight: 950
              }}>{club?.club_name ?? t('clubAdmin.pods.clubPods')}</Typography>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>{t('clubAdmin.pods.createEditDelete')}</Typography>
            </Stack>
            <DuncitButton
              variant="outlined"
              startIcon={<EditIcon />}
              component={RouterLink}
              to={`/club-admin/clubs/${clubId}/edit`}
            >
              {t('clubAdmin.clubs.editClub')}
            </DuncitButton>
          </Stack>
          {lookups.error && <Alert severity="error">{lookups.error.message}</Alert>}
          {deleteError && <Alert severity="error">{deleteError}</Alert>}
          <PodsTable<PodRowBase>
            tableId="partners-app-club-admin-pods"
            fetchRows={fetchRows}
            refetchRef={refetchRef}
            venueName={venueName}
            emptyText={t('clubAdmin.pods.noPods')}
            toolbarActions={
              <>
                <PodStatusFilter value={status} onChange={setStatus} />
                <CreatePodLauncher
                  clubId={clubId}
                  onNormal={() => navigate(`${podsPath}/new`)}
                />
              </>
            }
            renderActions={renderActions}
            actionsWidth={160}
            renderMonitor={(pod) => <AiMonitorPill onClick={() => setTrailPod(pod)} />}
          />
        </Stack>
      </CardContent>

      <PodActivityDialog pod={trailPod} onClose={() => setTrailPod(null)} />

      <ConfirmDialog
        open={!!podToDelete}
        title={t('clubAdmin.pods.deletePodConfirmTitle')}
        message={t('clubAdmin.pods.deletePodConfirmBody', { vars: { title: podToDelete?.pod_title ?? '' } })}
        destructive
        busy={deleteState.loading}
        busyLabel={t('shell.common.deleting')}
        confirmLabel={t('shell.common.delete')}
        onConfirm={confirmDelete}
        onClose={() => setPodToDelete(null)}
      />

      <Snackbar open={!!message} autoHideDuration={2500} message={message ?? ''} onClose={() => setMessage(null)} />
    </Card>
  );
}
