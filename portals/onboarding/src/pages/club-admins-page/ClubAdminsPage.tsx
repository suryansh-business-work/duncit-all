import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog } from '@duncit/dialogs';
import HardDeleteDialog from '../../components/HardDeleteDialog';
import { useEntityLifecycle } from '../../components/useEntityLifecycle';
import ClubAdminsTable from './ClubAdminsTable';
import ClubAdminEditDialog from './ClubAdminEditDialog';
import ClubAdminReviewDialog from './ClubAdminReviewDialog';
import {
  APPROVE_CLUB_ADMIN,
  ASSIGN_CLUB_ADMIN_CLUBS,
  CLUB_ADMINS_TABLE,
  DEFAULT_CLUB_ADMIN_COMMISSION,
  DELETE_CLUB_ADMIN,
  REJECT_CLUB_ADMIN,
  SET_CLUB_ADMIN_ACTIVE,
  SET_CLUB_ADMIN_COMMISSION,
  type ClubAdminRow,
} from './queries';

export default function ClubAdminsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => refetchRef.current?.(), []);

  const [approve] = useMutation(APPROVE_CLUB_ADMIN);
  const [reject] = useMutation(REJECT_CLUB_ADMIN);
  const [setCommission, { loading: savingCommission }] = useMutation(SET_CLUB_ADMIN_COMMISSION);
  const [assignClubs, { loading: savingClubs }] = useMutation(ASSIGN_CLUB_ADMIN_CLUBS);
  const lifecycle = useEntityLifecycle(SET_CLUB_ADMIN_ACTIVE, DELETE_CLUB_ADMIN, refresh);

  const { data: defaultsData } = useQuery(DEFAULT_CLUB_ADMIN_COMMISSION, {
    fetchPolicy: 'cache-first',
  });
  const defaultCommissionPct: number | undefined = defaultsData?.defaultClubAdminCommissionPct;

  const [active, setActive] = useState<ClubAdminRow | null>(null);
  const [editing, setEditing] = useState<ClubAdminRow | null>(null);
  const [notes, setNotes] = useState('');

  const fetchRows = useApolloTableFetch<ClubAdminRow>(
    client,
    CLUB_ADMINS_TABLE,
    'clubAdminProfilesTable'
  );

  const openReview = (row: ClubAdminRow) => {
    setActive(row);
    setNotes(row.reviewer_notes ?? '');
  };

  const closeReview = () => {
    setActive(null);
    setNotes('');
  };

  const doApprove = async () => {
    if (!active) return;
    await approve({ variables: { id: active.id, notes: notes.trim() || null } });
    closeReview();
    refresh();
  };

  const doReject = async () => {
    if (!active || !notes.trim()) return;
    await reject({ variables: { id: active.id, notes } });
    closeReview();
    refresh();
  };

  const doSaveCommission = async (commissionPct: number) => {
    if (!active) return;
    await setCommission({ variables: { id: active.id, commission_pct: commissionPct } });
    // Keep the open dialog honest without closing it.
    setActive((current) => (current ? { ...current, commission_pct: commissionPct } : current));
    refresh();
  };

  const doAssignClubs = async (clubIds: string[]) => {
    if (!active) return;
    const { data } = await assignClubs({ variables: { id: active.id, club_ids: clubIds } });
    // The dialog's Assign Clubs list seeds from `assigned_clubs`, so it has to
    // reflect the save or the next open would show the old set.
    const saved = data?.assignClubAdminClubs;
    if (saved) setActive((current) => (current ? { ...current, ...saved } : current));
    refresh();
  };

  const toggleTarget = lifecycle.toggleTarget as ClubAdminRow | null;
  const deactivating = toggleTarget?.is_active !== false;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <GroupsIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Onboarded Club Admins
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Everyone approved through the Club Admin onboarding meeting flow. New Club Admins stay
            Inactive until reviewed.
          </Typography>
        </Box>
      </Stack>

      <ClubAdminsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onEdit={setEditing}
        onReview={openReview}
        canHardDelete={lifecycle.canHardDelete}
        onToggleActive={lifecycle.setToggleTarget}
        onDelete={lifecycle.setDeleteTarget}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        title={deactivating ? 'Deactivate Club Admin' : 'Activate Club Admin'}
        message={
          deactivating
            ? 'They lose access to the Club Admin dashboard and can no longer create or edit pods for their clubs. Their club assignments are kept, and you can reactivate them at any time.'
            : 'They regain access to the Club Admin dashboard and to the clubs assigned to them.'
        }
        confirmLabel={deactivating ? 'Deactivate' : 'Activate'}
        confirmColor={deactivating ? 'warning' : 'success'}
        loading={lifecycle.toggling}
        busyLabel="Working…"
        onClose={() => lifecycle.setToggleTarget(null)}
        onConfirm={lifecycle.confirmToggle}
      />

      <HardDeleteDialog
        open={!!lifecycle.deleteTarget}
        entityLabel="Club Admin"
        entityName={(lifecycle.deleteTarget as ClubAdminRow | null)?.full_name ?? ''}
        loading={lifecycle.deleting}
        error={lifecycle.deleteError}
        onClose={lifecycle.closeDelete}
        onConfirm={lifecycle.confirmDelete}
      />

      <ClubAdminEditDialog row={editing} onClose={() => setEditing(null)} onSaved={refresh} />

      <ClubAdminReviewDialog
        active={active}
        notes={notes}
        setNotes={setNotes}
        onClose={closeReview}
        onApprove={doApprove}
        onReject={doReject}
        onSaveCommission={doSaveCommission}
        savingCommission={savingCommission}
        onAssignClubs={doAssignClubs}
        savingClubs={savingClubs}
        defaultCommissionPct={defaultCommissionPct}
      />
    </Box>
  );
}
