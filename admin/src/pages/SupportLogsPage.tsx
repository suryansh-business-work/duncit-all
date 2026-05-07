import { useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
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
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ContactDetailsDialog from './contact-submissions-page/ContactDetailsDialog';

const SUBMISSIONS = gql`
  query SupportLogs($status: ContactStatus) {
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
  mutation UpdateSupportStatus($id: ID!, $status: ContactStatus!) {
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

const TAG_RE = /^\[([A-Z_]+)\]\s*/;

export default function SupportLogsPage() {
  const [status, setStatus] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const { data, loading, error, refetch } = useQuery<{ contactSubmissions: Submission[] }>(
    SUBMISSIONS,
    { variables: { status: status || null }, fetchPolicy: 'cache-and-network' }
  );
  const [updateStatus] = useMutation(UPDATE_STATUS, { onCompleted: () => refetch() });
  const [open, setOpen] = useState<Submission | null>(null);

  const all = data?.contactSubmissions ?? [];
  const supportItems = useMemo(
    () => all.filter((s) => TAG_RE.test(s.subject)),
    [all]
  );
  const categories = useMemo(() => {
    const set = new Set<string>();
    supportItems.forEach((s) => {
      const m = s.subject.match(TAG_RE);
      if (m) set.add(m[1]);
    });
    return Array.from(set).sort();
  }, [supportItems]);

  const filtered = useMemo(() => {
    if (!category) return supportItems;
    return supportItems.filter((s) => s.subject.startsWith(`[${category}]`));
  }, [supportItems, category]);

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <SupportAgentIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          Support Logs
        </Typography>
      </Stack>

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mb: 2 }}>
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
            <TextField
              select
              size="small"
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {error && <Alert severity="error">{error.message}</Alert>}

          {loading && !data ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : filtered.length === 0 ? (
            <Alert severity="info">No support submissions yet.</Alert>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((s) => {
                    const m = s.subject.match(TAG_RE);
                    const tag = m ? m[1] : 'OTHER';
                    const cleanSubject = s.subject.replace(TAG_RE, '');
                    return (
                      <TableRow key={s.id} hover>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(s.created_at).toLocaleString('en-IN')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={tag} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{cleanSubject}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" color={COLOR[s.status]} label={s.status} />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => setOpen(s)} aria-label="View">
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      {open && (
        <ContactDetailsDialog
          submission={open}
          onClose={() => setOpen(null)}
          onUpdateStatus={(id, next) => updateStatus({ variables: { id, status: next } })}
        />
      )}
    </Stack>
  );
}
