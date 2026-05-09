import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AdminHostCreateDialog from '../../components/AdminHostCreateDialog';
import { APPROVE, HOSTS, REJECT, STATUSES } from './queries';
import HostCard from './HostCard';
import HostReviewDialog from './HostReviewDialog';

export default function HostsPage() {
  const [status, setStatus] = useState('SUBMITTED');
  const { data, loading, error, refetch } = useQuery(HOSTS, {
    variables: { status: status || null },
  });
  const [approve] = useMutation(APPROVE);
  const [reject] = useMutation(REJECT);
  const [active, setActive] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const doApprove = async () => {
    await approve({ variables: { id: active.id, notes } });
    setActive(null);
    setNotes('');
    refetch();
  };
  const doReject = async () => {
    if (!notes.trim()) return;
    await reject({ variables: { id: active.id, notes } });
    setActive(null);
    setNotes('');
    refetch();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Host Onboarding
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            Create on behalf
          </Button>
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
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
      {loading && !data && <CircularProgress />}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)' },
        }}
      >
        {(data?.hosts ?? []).map((h: any) => (
          <HostCard key={h.id} host={h} onReview={setActive} />
        ))}
      </Box>

      <HostReviewDialog
        active={active}
        notes={notes}
        setNotes={setNotes}
        onClose={() => setActive(null)}
        onApprove={doApprove}
        onReject={doReject}
      />

      <AdminHostCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refetch()}
      />
    </Box>
  );
}
