import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import AdminVenueCreateDialog from '../../components/AdminVenueCreateDialog';
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
import { APPROVE, REJECT, STATUSES, VENUES } from './queries';
import VenueCard from './VenueCard';
import VenueReviewDialog from './VenueReviewDialog';

export default function VenuesPage() {
  const [status, setStatus] = useState('SUBMITTED');
  const { data, loading, error, refetch } = useQuery(VENUES, {
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
          Venue Onboarding
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
        {(data?.venues ?? []).map((v: any) => (
          <VenueCard key={v.id} venue={v} onReview={setActive} />
        ))}
      </Box>

      <VenueReviewDialog
        active={active}
        notes={notes}
        setNotes={setNotes}
        onClose={() => setActive(null)}
        onApprove={doApprove}
        onReject={doReject}
      />

      <AdminVenueCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refetch()}
      />
    </Box>
  );
}
