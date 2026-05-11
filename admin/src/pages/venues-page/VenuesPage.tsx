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
import VenueEditDialog from './VenueEditDialog';
import VenueReviewDialog from './VenueReviewDialog';
import VenuesTable from './VenuesTable';

export default function VenuesPage() {
  const [status, setStatus] = useState('APPROVED');
  const { data, loading, error, refetch } = useQuery(VENUES, {
    variables: { status: status || null },
  });
  const [approve] = useMutation(APPROVE);
  const [reject] = useMutation(REJECT);
  const [active, setActive] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const parseTags = () =>
    tagsText.split(',').map((tag) => tag.trim()).filter(Boolean);

  const openReview = (venue: any) => {
    setActive(venue);
    setTagsText((venue.tags ?? []).join(', '));
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
          <Typography variant="h5" fontWeight={700}>Registered Venues</Typography>
          <Typography variant="body2" color="text.secondary">
            Registered and approved venues available for clubs, pods and meetups.
          </Typography>
        </Stack>
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

      <VenuesTable venues={data?.venues ?? []} onEdit={setEditing} onReview={openReview} />

      <VenueReviewDialog
        active={active}
        notes={notes}
        setNotes={setNotes}
        tagsText={tagsText}
        setTagsText={setTagsText}
        onClose={() => setActive(null)}
        onApprove={doApprove}
        onReject={doReject}
      />

      <AdminVenueCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refetch()}
      />
      <VenueEditDialog venue={editing} onClose={() => setEditing(null)} onSaved={() => refetch()} />
    </Box>
  );
}
