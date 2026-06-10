import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
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
import { useDateFormat } from '../../../utils/dateFormat';
import { parseApiError } from '../../../utils/parseApiError';
import ContactDetailsDialog from './ContactDetailsDialog';
import {
  CONTACT_STATUS_COLOR,
  CONTACT_STATUSES,
  CONTACT_SUBMISSIONS,
  UPDATE_CONTACT_STATUS,
  type ContactStatus,
  type ContactSubmission,
} from './queries';

export default function ContactSubmissionsPage() {
  const [status, setStatus] = useState<ContactStatus | ''>('');
  const { data, loading, error, refetch } = useQuery<{ contactSubmissions: ContactSubmission[] }>(
    CONTACT_SUBMISSIONS,
    { variables: { status: status || null }, fetchPolicy: 'cache-and-network' },
  );
  const [updateStatus] = useMutation(UPDATE_CONTACT_STATUS, { onCompleted: () => refetch() });
  const { formatDateTime } = useDateFormat();
  const [open, setOpen] = useState<ContactSubmission | null>(null);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Contact Submission
      </Typography>
      <Card>
        <CardContent>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ContactStatus | '')}
            sx={{ minWidth: 200, mb: 2 }}
          >
            <MenuItem value="">All</MenuItem>
            {CONTACT_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {error && <Typography color="error">{parseApiError(error)}</Typography>}
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
                      <Chip size="small" label={r.status} color={CONTACT_STATUS_COLOR[r.status] || 'default'} />
                    </TableCell>
                    <TableCell>{formatDateTime(r.created_at)}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setOpen(r)} aria-label="view">
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
