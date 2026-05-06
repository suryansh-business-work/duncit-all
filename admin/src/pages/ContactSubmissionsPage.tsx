import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContactDetailsDialog from './contact-submissions-page/ContactDetailsDialog';

const SUBMISSIONS = gql`
  query ContactSubmissions($status: ContactStatus) {
    contactSubmissions(status: $status) {
      id
      name
      email
      subject
      message
      status
      created_at
    }
  }
`;

const UPDATE_STATUS = gql`
  mutation UpdateContactStatus($id: ID!, $status: ContactStatus!) {
    updateContactStatus(contact_id: $id, status: $status) {
      id
      status
    }
  }
`;

const STATUSES = ['', 'NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'] as const;

const COLOR: Record<string, 'default' | 'primary' | 'warning' | 'success'> = {
  NEW: 'primary',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  ARCHIVED: 'default',
};

interface Submission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export default function ContactSubmissionsPage() {
  const [status, setStatus] = useState<string>('');
  const { data, loading, error, refetch } = useQuery<{ contactSubmissions: Submission[] }>(
    SUBMISSIONS,
    { variables: { status: status || null }, fetchPolicy: 'cache-and-network' }
  );
  const [updateStatus] = useMutation(UPDATE_STATUS, { onCompleted: () => refetch() });
  const [open, setOpen] = useState<Submission | null>(null);

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Contact Submissions
      </Typography>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <TextField
              select
              size="small"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {STATUSES.map((s) => (
                <MenuItem key={s || 'all'} value={s}>
                  {s || 'All'}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {error && <Typography color="error">{error.message}</Typography>}
          {!loading && !error && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Received</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.contactSubmissions ?? []).map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.subject || '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.status} color={COLOR[r.status] || 'default'} />
                    </TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setOpen(r)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!(data?.contactSubmissions ?? []).length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No submissions.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <ContactDetailsDialog
        submission={open}
        onClose={() => setOpen(null)}
        onUpdateStatus={(id, s) => updateStatus({ variables: { id, status: s } })}
      />
    </Stack>
  );
}
