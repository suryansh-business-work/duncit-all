import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { BOUNCER_CALLBACK_REQUESTS, type CallbackRequest } from '../../graphql/bouncer';
import { useSupportSocket } from '../../lib/useSupportSocket';
import StatusFilter, { type StatusOption } from '../../components/StatusFilter';

type CallbackFilter = CallbackRequest['status'] | 'ALL';

const STATUS_COLOR: Record<CallbackRequest['status'], 'warning' | 'primary' | 'default'> = {
  PENDING: 'warning',
  CONTACTED: 'primary',
  CLOSED: 'default',
};

// "Resolved" is the user-facing label for the backend CLOSED status.
const FILTER_OPTIONS: ReadonlyArray<StatusOption<CallbackRequest['status']>> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'CLOSED', label: 'Resolved' },
];

function matchesSearch(req: CallbackRequest, q: string): boolean {
  const haystack = `${req.ticket_no} ${req.user.name} ${req.pod?.title ?? ''} ${req.contact_phone}`.toLowerCase();
  return haystack.includes(q);
}

export default function CallbacksListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<CallbackFilter>('ALL');
  const [search, setSearch] = useState('');
  const { data, loading, refetch } = useQuery<{ bouncerCallbackRequests: CallbackRequest[] }>(
    BOUNCER_CALLBACK_REQUESTS,
    {
      variables: { status: filter === 'ALL' ? null : filter },
      fetchPolicy: 'cache-and-network',
    }
  );

  useSupportSocket({
    onCallback: () => refetch(),
    onCallbackUpdate: () => refetch(),
  });

  const query = search.trim().toLowerCase();
  const items = useMemo(() => {
    const rows = data?.bouncerCallbackRequests ?? [];
    return query ? rows.filter((req) => matchesSearch(req, query)) : rows;
  }, [data, query]);

  const renderBody = () => {
    if (loading && !items.length) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      );
    }
    if (!items.length) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No Callback Requests Found
        </Typography>
      );
    }
    return (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>User</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Pod</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Requested</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((req) => (
            <TableRow
              key={req.id}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/callbacks/${req.id}`)}
            >
              <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{req.ticket_no}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{req.user.name}</TableCell>
              <TableCell>{req.contact_phone || '—'}</TableCell>
              <TableCell>{req.pod?.title ?? '—'}</TableCell>
              <TableCell>
                <Chip size="small" color={STATUS_COLOR[req.status]} label={req.status} />
              </TableCell>
              <TableCell>{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} flexWrap="wrap">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Callback Requests
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Users who asked for a call back. Open one to mark it contacted or close it.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <StatusFilter value={filter} options={FILTER_OPTIONS} onChange={setFilter} />
        </Stack>
      </Stack>
      {renderBody()}
    </Stack>
  );
}
