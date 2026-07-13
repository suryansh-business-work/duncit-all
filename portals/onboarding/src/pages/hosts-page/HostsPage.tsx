import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import TableSkeleton from '../../components/TableSkeleton';
import ConfirmDialog from '../../components/ConfirmDialog';
import HardDeleteDialog from '../../components/HardDeleteDialog';
import { useEntityLifecycle } from '../../components/useEntityLifecycle';
import { APPROVE, DELETE_HOST, HOSTS, REJECT, SET_HOST_ACTIVE, SET_HOST_DEDUCTIONS, STATUSES } from './queries';
import HostEditDialog from './HostEditDialog';
import HostReviewDialog from './HostReviewDialog';
import HostsTable from './HostsTable';

export default function HostsPage() {
  const [status, setStatus] = useState('');
  const { data, loading, error, refetch } = useQuery(HOSTS, {
    variables: { status: status || null },
  });
  const [approve] = useMutation(APPROVE);
  const [reject] = useMutation(REJECT);
  const [setHostDeductions, { loading: savingCommission }] = useMutation(SET_HOST_DEDUCTIONS);
  const lifecycle = useEntityLifecycle(SET_HOST_ACTIVE, DELETE_HOST, refetch);
  const [active, setActive] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [editing, setEditing] = useState<any>(null);

  const parseTags = () =>
    tagsText.split(',').map((tag) => tag.trim()).filter(Boolean);

  const openReview = (host: any) => {
    setActive(host);
    setTagsText((host.tags ?? []).join(', '));
  };

  const doApprove = async () => {
    await approve({ variables: { id: active.id, notes, tags: parseTags() } });
    setActive(null);
    setNotes('');
    setTagsText('');
    refetch();
  };
  const doReject = async () => {
    if (!notes.trim()) return;
    await reject({ variables: { id: active.id, notes } });
    setActive(null);
    setNotes('');
    setTagsText('');
    refetch();
  };
  const doSaveCommission = async (commissionPct: number) => {
    await setHostDeductions({
      variables: { user_id: active.user_id, host_commission_pct: commissionPct },
    });
    setActive((current: any) =>
      current ? { ...current, host_commission_pct: commissionPct } : current
    );
    refetch();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack spacing={0.25}>
          <Typography variant="h5" fontWeight={700}>Hosts</Typography>
          <Typography variant="body2" color="text.secondary">
            Review submitted host requests and manage approved hosts for Duncit communities.
          </Typography>
        </Stack>
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {s || 'All'}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}

      {loading && !data ? (
        <TableSkeleton columns={8} />
      ) : (
        <HostsTable
          hosts={data?.hosts ?? []}
          onEdit={setEditing}
          onReview={openReview}
          canHardDelete={lifecycle.canHardDelete}
          onToggleActive={lifecycle.setToggleTarget}
          onDelete={lifecycle.setDeleteTarget}
        />
      )}

      <ConfirmDialog
        open={!!lifecycle.toggleTarget}
        title={lifecycle.toggleTarget?.is_active === false ? 'Activate host' : 'Deactivate host'}
        message={
          lifecycle.toggleTarget?.is_active === false
            ? 'This host will be able to create and host pods again.'
            : 'This host will be unable to create pods and will be hidden from public discovery. You can reactivate them anytime.'
        }
        confirmLabel={lifecycle.toggleTarget?.is_active === false ? 'Activate' : 'Deactivate'}
        confirmColor={lifecycle.toggleTarget?.is_active === false ? 'success' : 'warning'}
        loading={lifecycle.toggling}
        onClose={() => lifecycle.setToggleTarget(null)}
        onConfirm={lifecycle.confirmToggle}
      />

      <HardDeleteDialog
        open={!!lifecycle.deleteTarget}
        entityLabel="host"
        entityName={lifecycle.deleteTarget?.full_name ?? ''}
        loading={lifecycle.deleting}
        error={lifecycle.deleteError}
        onClose={lifecycle.closeDelete}
        onConfirm={lifecycle.confirmDelete}
      />

      <HostReviewDialog
        active={active}
        notes={notes}
        setNotes={setNotes}
        tagsText={tagsText}
        setTagsText={setTagsText}
        onClose={() => setActive(null)}
        onApprove={doApprove}
        onReject={doReject}
        onSaveCommission={doSaveCommission}
        savingCommission={savingCommission}
      />

      <HostEditDialog host={editing} onClose={() => setEditing(null)} onSaved={() => refetch()} />
    </Box>
  );
}
