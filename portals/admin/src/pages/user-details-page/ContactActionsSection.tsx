import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
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
import DeleteIcon from '@mui/icons-material/Delete';
import { DELETE_USER_CONTACT_ACTION, USER_CONTACT_ACTIONS } from './queries';

interface Props {
  userId: string;
  refreshToken: number;
}

export default function ContactActionsSection({ userId, refreshToken }: Readonly<Props>) {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useQuery(USER_CONTACT_ACTIONS, {
    variables: { user_id: userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });
  const [deleteAction] = useMutation(DELETE_USER_CONTACT_ACTION);

  const actions = (data?.userContactActions ?? []) as any[];
  const statuses = useMemo<string[]>(
    () => Array.from(new Set(actions.map((action) => String(action.status || '')).filter(Boolean))).sort(),
    [actions]
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return actions.filter((action: any) => {
      const matchesType = !typeFilter || action.type === typeFilter;
      const matchesStatus = !statusFilter || action.status === statusFilter;
      const haystack = `${action.target} ${action.subject} ${action.notes}`.toLowerCase();
      return matchesType && matchesStatus && (!term || haystack.includes(term));
    });
  }, [actions, search, statusFilter, typeFilter]);

  const remove = async (id: string) => {
    await deleteAction({ variables: { action_id: id } });
    await refetch();
  };

  useEffect(() => {
    if (refreshToken) refetch();
  }, [refreshToken, refetch]);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" fontWeight={700}>Call &amp; Email Logs</Typography>
          <Typography variant="body2" color="text.secondary">Filter user outreach by type, status, or notes.</Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField select size="small" label="Type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="CALL">Call</MenuItem>
            <MenuItem value="EMAIL">Email</MenuItem>
          </TextField>
          <TextField select size="small" label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">All</MenuItem>
            {statuses.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Search" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ minWidth: { sm: 220 } }} />
        </Stack>
      </Stack>
      {loading && !data ? <CircularProgress size={22} /> : null}
      {error && <Alert severity="error">{error.message}</Alert>}
      {filtered.length === 0 && !loading ? (
        <Typography variant="body2" color="text.secondary">No contact logs match the selected filters.</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label="call and email logs">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Target</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>When</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((action: any) => (
                <TableRow key={action.id} hover>
                  <TableCell>
                    <Chip size="small" label={action.type} color={action.type === 'CALL' ? 'primary' : 'secondary'} />
                  </TableCell>
                  <TableCell>{action.target}</TableCell>
                  <TableCell>{action.status}</TableCell>
                  <TableCell>
                    <Stack spacing={0.25}>
                      {action.subject && <Typography variant="caption">{action.subject}</Typography>}
                      {action.notes && <Typography variant="caption" color="text.secondary">{action.notes}</Typography>}
                      {action.recording_url && <Typography variant="caption" component="a" href={action.recording_url} target="_blank" rel="noreferrer">Recording</Typography>}
                    </Stack>
                  </TableCell>
                  <TableCell>{new Date(action.created_at).toLocaleString()}{action.duration_seconds ? ` (${action.duration_seconds}s)` : ''}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => remove(action.id)} aria-label="delete contact log">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Stack>
  );
}