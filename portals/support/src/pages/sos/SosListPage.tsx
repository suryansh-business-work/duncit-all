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
  Typography,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { BOUNCER_SOS_ALERTS, type SosAlert } from '../../graphql/bouncer';
import { useSupportSocket } from '../../lib/useSupportSocket';

const STATUS_COLOR: Record<SosAlert['status'], 'error' | 'warning' | 'success'> = {
  ACTIVE: 'error',
  ACKNOWLEDGED: 'warning',
  RESOLVED: 'success',
};

export default function SosListPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ bouncerSosAlerts: SosAlert[] }>(BOUNCER_SOS_ALERTS, {
    variables: { status: null },
    fetchPolicy: 'cache-and-network',
  });

  useSupportSocket({
    onSos: () => refetch(),
    onSosUpdate: () => refetch(),
  });

  const alerts = data?.bouncerSosAlerts ?? [];

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          SOS Alerts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Live safety alerts raised by users. Open one to acknowledge or resolve it.
        </Typography>
      </Box>

      {loading && !alerts.length ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : !alerts.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No SOS alerts yet.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
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
      )}
    </Stack>
  );
}
