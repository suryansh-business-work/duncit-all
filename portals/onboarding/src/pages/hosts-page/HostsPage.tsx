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
import { APPROVE, HOSTS, REJECT, STATUSES } from './queries';
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
  const [active, setActive] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [editing, setEditing] = useState<any | null>(null);

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
        <TableSkeleton columns={7} />
      ) : (
        <HostsTable hosts={data?.hosts ?? []} onEdit={setEditing} onReview={openReview} />
      )}

      <HostReviewDialog
        active={active}
        notes={notes}
        setNotes={setNotes}
        tagsText={tagsText}
        setTagsText={setTagsText}
        onClose={() => setActive(null)}
        onApprove={doApprove}
        onReject={doReject}
      />

      <HostEditDialog host={editing} onClose={() => setEditing(null)} onSaved={() => refetch()} />
    </Box>
  );
}
