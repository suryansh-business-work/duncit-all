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
import { APPROVE, REJECT, SET_VENUE_DEDUCTIONS, STATUSES, VENUES } from './queries';
import VenueEditDialog from './VenueEditDialog';
import VenueReviewDialog from './VenueReviewDialog';
import VenuesTable from './VenuesTable';

export default function VenuesPage() {
  const [status, setStatus] = useState('');
  const { data, loading, error, refetch } = useQuery(VENUES, {
    variables: { status: status || null },
  });
  const [approve] = useMutation(APPROVE);
  const [reject] = useMutation(REJECT);
  const [setVenueDeductions, { loading: savingDeductions }] = useMutation(SET_VENUE_DEDUCTIONS);
  const [active, setActive] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');
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
  const doSaveDeductions = async (sharePct: number, commissionPct: number) => {
    await setVenueDeductions({
      variables: { id: active.id, venue_share_pct: sharePct, venue_commission_pct: commissionPct },
    });
    setActive((current: any) =>
      current ? { ...current, venue_share_pct: sharePct, venue_commission_pct: commissionPct } : current
    );
    refetch();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack spacing={0.25}>
          <Typography variant="h5" fontWeight={700}>Registered Venues</Typography>
          <Typography variant="body2" color="text.secondary">
            Review submitted venue requests and manage approved spaces for clubs, pods and meetups.
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
        <VenuesTable venues={data?.venues ?? []} onEdit={setEditing} onReview={openReview} />
      )}

      <VenueReviewDialog
        active={active}
        notes={notes}
        setNotes={setNotes}
        tagsText={tagsText}
        setTagsText={setTagsText}
        onClose={() => setActive(null)}
        onApprove={doApprove}
        onReject={doReject}
        onSaveDeductions={doSaveDeductions}
        savingDeductions={savingDeductions}
      />

      <VenueEditDialog venue={editing} onClose={() => setEditing(null)} onSaved={() => refetch()} />
    </Box>
  );
}
