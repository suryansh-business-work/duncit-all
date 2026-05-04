import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
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

const HOSTS = gql`
  query Hosts($status: HostStatus) {
    hosts(status: $status) {
      id
      full_name
      email
      phone
      dob
      aadhar_number
      pan_number
      passport_photo_url
      police_verification_url
      full_address
      step_completed
      status
      submitted_at
      reviewer_notes
    }
  }
`;
const APPROVE = gql`
  mutation ApproveHost($id: ID!, $notes: String) {
    approveHost(host_doc_id: $id, notes: $notes) {
      id
    }
  }
`;
const REJECT = gql`
  mutation RejectHost($id: ID!, $notes: String!) {
    rejectHost(host_doc_id: $id, notes: $notes) {
      id
    }
  }
`;

const STATUSES = ['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

export default function HostsPage() {
  const [status, setStatus] = useState('SUBMITTED');
  const { data, loading, error, refetch } = useQuery(HOSTS, {
    variables: { status: status || null },
  });
  const [approve] = useMutation(APPROVE);
  const [reject] = useMutation(REJECT);
  const [active, setActive] = useState<any | null>(null);
  const [notes, setNotes] = useState('');

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
      {loading && !data && <CircularProgress />}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)' },
        }}
      >
        {(data?.hosts ?? []).map((h: any) => (
          <Card key={h.id} variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {h.full_name || '(Unnamed)'}
                </Typography>
                <Chip
                  size="small"
                  label={h.status}
                  color={
                    h.status === 'APPROVED'
                      ? 'success'
                      : h.status === 'REJECTED'
                      ? 'error'
                      : h.status === 'SUBMITTED'
                      ? 'warning'
                      : 'default'
                  }
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {h.email} · {h.phone}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Step {h.step_completed}/4
              </Typography>
              {h.reviewer_notes && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {h.reviewer_notes}
                </Alert>
              )}
              <Stack direction="row" spacing={1} mt={2}>
                <Button size="small" variant="outlined" onClick={() => setActive(h)}>
                  Review
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Dialog open={!!active} onClose={() => setActive(null)} fullWidth maxWidth="sm">
        <DialogTitle>Review · {active?.full_name}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2">
              Aadhar: {active?.aadhar_number || '—'} · PAN: {active?.pan_number || '—'}
            </Typography>
            <Typography variant="body2">DOB: {active?.dob?.slice(0, 10) || '—'}</Typography>
            <Typography variant="body2">Address: {active?.full_address || '—'}</Typography>
            <Stack direction="row" spacing={2}>
              {active?.passport_photo_url && (
                <a href={active.passport_photo_url} target="_blank" rel="noreferrer">
                  Passport photo
                </a>
              )}
              {active?.police_verification_url && (
                <a href={active.police_verification_url} target="_blank" rel="noreferrer">
                  Police verification
                </a>
              )}
            </Stack>
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
    </Box>
  );
}
