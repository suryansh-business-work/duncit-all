import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import AdminVenueCreateDialog from '../components/AdminVenueCreateDialog';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const VENUES = gql`
  query Venues($status: VenueStatus) {
    venues(status: $status) {
      id
      venue_name
      venue_type
      city
      capacity
      status
      step_completed
      submitted_at
      reviewer_notes
      owner_name
      owner_email
      owner_phone
      gstin
      pan
      documents {
        type
        url
      }
    }
  }
`;
const APPROVE = gql`
  mutation ApproveVenue($id: ID!, $notes: String) {
    approveVenue(venue_doc_id: $id, notes: $notes) {
      id
    }
  }
`;
const REJECT = gql`
  mutation RejectVenue($id: ID!, $notes: String!) {
    rejectVenue(venue_doc_id: $id, notes: $notes) {
      id
    }
  }
`;

const STATUSES = ['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

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
          <Card key={v.id} variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {v.venue_name || '(Unnamed venue)'}
                </Typography>
                <Chip
                  size="small"
                  label={v.status}
                  color={
                    v.status === 'APPROVED'
                      ? 'success'
                      : v.status === 'REJECTED'
                      ? 'error'
                      : v.status === 'SUBMITTED'
                      ? 'warning'
                      : 'default'
                  }
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {v.venue_type} · {v.city} · cap {v.capacity}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Step {v.step_completed}/4 · {v.documents?.length ?? 0} document(s)
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Owner: {v.owner_name} · {v.owner_email} · {v.owner_phone}
              </Typography>
              {v.reviewer_notes && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {v.reviewer_notes}
                </Alert>
              )}
              <Stack direction="row" spacing={1} mt={2}>
                <Button size="small" variant="outlined" onClick={() => setActive(v)}>
                  Review
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Dialog open={!!active} onClose={() => setActive(null)} fullWidth maxWidth="sm">
        <DialogTitle>Review · {active?.venue_name}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2">
              Type: {active?.venue_type} · Capacity: {active?.capacity}
            </Typography>
            <Typography variant="body2">
              City: {active?.city} · GSTIN: {active?.gstin || '—'} · PAN: {active?.pan || '—'}
            </Typography>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Documents
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {(active?.documents ?? []).map((d: any, i: number) => (
                  <a key={i} href={d.url} target="_blank" rel="noreferrer">
                    {d.type}
                  </a>
                ))}
              </Stack>
            </Box>
            <TextField
              label="Reviewer notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActive(null)}>Close</Button>
          <Button color="error" onClick={doReject} disabled={!notes.trim()}>
            Reject
          </Button>
          <Button variant="contained" color="success" onClick={doApprove}>
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      <AdminVenueCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refetch()}
      />
    </Box>
  );
}
