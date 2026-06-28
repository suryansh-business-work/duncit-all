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
import { BOUNCER_SOS_ALERTS, type SosAlert } from '../../graphql/bouncer';
import { useSupportSocket } from '../../lib/useSupportSocket';
import StatusFilter, { type StatusOption } from '../../components/StatusFilter';

type SosFilter = SosAlert['status'] | 'ALL';

const STATUS_COLOR: Record<SosAlert['status'], 'error' | 'warning' | 'success'> = {
  ACTIVE: 'error',
  ACKNOWLEDGED: 'warning',
  RESOLVED: 'success',
};

// "Active" groups the open ACTIVE + ACKNOWLEDGED states; "Resolved" = RESOLVED.
const FILTER_OPTIONS: ReadonlyArray<StatusOption<SosAlert['status']>> = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RESOLVED', label: 'Resolved' },
];

function matchesSearch(a: SosAlert, q: string): boolean {
  const haystack = `${a.ticket_no} ${a.user.name} ${a.pod.title} ${a.contact_phone}`.toLowerCase();
  return haystack.includes(q);
}

export default function SosListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SosFilter>('ALL');
  const [search, setSearch] = useState('');
  const { data, loading, refetch } = useQuery<{ bouncerSosAlerts: SosAlert[] }>(BOUNCER_SOS_ALERTS, {
    variables: { status: filter === 'ALL' ? null : filter },
    fetchPolicy: 'cache-and-network',
  });

  useSupportSocket({
    onSos: () => refetch(),
    onSosUpdate: () => refetch(),
  });

  const query = search.trim().toLowerCase();
  const alerts = useMemo(() => {
    const rows = data?.bouncerSosAlerts ?? [];
    return query ? rows.filter((a) => matchesSearch(a, query)) : rows;
  }, [data, query]);

  const renderBody = () => {
    if (loading && !alerts.length) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      );
    }
    if (!alerts.length) {
      const empty = filter === 'ACTIVE' ? 'No Active SOS Alerts Found' : 'No SOS Alerts Found';
      return (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          {empty}
        </Typography>
      );
    }
    return (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>User</TableCell>
            <TableCell>Pod</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Raised</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {alerts.map((a) => (
            <TableRow
              key={a.id}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/sos/${a.id}`)}
            >
              <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{a.ticket_no}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{a.user.name}</TableCell>
              <TableCell>{a.pod.title}{a.pod.venue_name ? ` · ${a.pod.venue_name}` : ''}</TableCell>
              <TableCell>{a.contact_phone || '—'}</TableCell>
              <TableCell>
                <Chip size="small" color={STATUS_COLOR[a.status]} label={a.status} />
              </TableCell>
              <TableCell>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</TableCell>
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
            SOS Alerts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live safety alerts raised by users. Open one to acknowledge or resolve it.
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
