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
import { BOUNCER_CALLBACK_REQUESTS, type CallbackRequest } from '../../graphql/bouncer';
import { useSupportSocket } from '../../lib/useSupportSocket';

const STATUS_COLOR: Record<CallbackRequest['status'], 'warning' | 'primary' | 'default'> = {
  PENDING: 'warning',
  CONTACTED: 'primary',
  CLOSED: 'default',
};

export default function CallbacksListPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ bouncerCallbackRequests: CallbackRequest[] }>(
    BOUNCER_CALLBACK_REQUESTS,
    { fetchPolicy: 'cache-and-network' }
  );

  useSupportSocket({
    onCallback: () => refetch(),
    onCallbackUpdate: () => refetch(),
  });

  const items = data?.bouncerCallbackRequests ?? [];

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Callback Requests
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Users who asked for a call back. Open one to mark it contacted or close it.
        </Typography>
      </Box>

      {loading && !items.length ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : !items.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No callback requests yet.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
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
      )}
    </Stack>
  );
}
