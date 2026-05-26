import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import {
  BOUNCER_CALLBACK_REQUESTS,
  CLOSE_CALLBACK,
  MARK_CALLBACK_CONTACTED,
  type CallbackRequest,
} from './queries';

const STATUS_COLOR: Record<CallbackRequest['status'], 'warning' | 'primary' | 'default'> = {
  PENDING: 'warning',
  CONTACTED: 'primary',
  CLOSED: 'default',
};

interface Props {
  liveItems: CallbackRequest[];
}

export default function CallbacksTab({ liveItems }: Props) {
  const { data, loading, refetch } = useQuery<{ bouncerCallbackRequests: CallbackRequest[] }>(
    BOUNCER_CALLBACK_REQUESTS,
    { fetchPolicy: 'cache-and-network' }
  );
  const [markContacted] = useMutation(MARK_CALLBACK_CONTACTED, { onCompleted: () => refetch() });
  const [closeCb] = useMutation(CLOSE_CALLBACK, { onCompleted: () => refetch() });
  const [busyId, setBusyId] = useState<string | null>(null);

  const queried = data?.bouncerCallbackRequests ?? [];
  const merged = mergeById(liveItems, queried);

  const run = async (id: string, fn: () => Promise<any>) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !merged.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!merged.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No callback requests yet.
      </Typography>
    );
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>User</TableCell>
          <TableCell>Phone</TableCell>
          <TableCell>Pod</TableCell>
          <TableCell>Reason</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Requested</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {merged.map((req) => (
          <TableRow key={req.id} hover>
            <TableCell sx={{ fontWeight: 700 }}>{req.user.name}</TableCell>
            <TableCell>
              {req.contact_phone ? (
                <Link href={`tel:${req.contact_phone}`}>{req.contact_phone}</Link>
              ) : (
                '—'
              )}
            </TableCell>
            <TableCell>{req.pod?.title ?? '—'}</TableCell>
            <TableCell>
              <Typography variant="body2" sx={{ whiteSpace: 'normal', maxWidth: 240 }}>
                {req.reason || '—'}
              </Typography>
            </TableCell>
            <TableCell>
              <Chip size="small" color={STATUS_COLOR[req.status]} label={req.status} />
            </TableCell>
            <TableCell>{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</TableCell>
            <TableCell align="right">
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {req.status === 'PENDING' && (
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={busyId === req.id}
                    onClick={() => run(req.id, () => markContacted({ variables: { id: req.id } }))}
                  >
                    Mark contacted
                  </Button>
                )}
                {req.status !== 'CLOSED' && (
                  <Button
                    size="small"
                    disabled={busyId === req.id}
                    onClick={() => run(req.id, () => closeCb({ variables: { id: req.id } }))}
                  >
                    Close
                  </Button>
                )}
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function mergeById<T extends { id: string; created_at: string }>(live: T[], queried: T[]): T[] {
  const map = new Map<string, T>();
  queried.forEach((q) => map.set(q.id, q));
  live.forEach((l) => map.set(l.id, l));
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
