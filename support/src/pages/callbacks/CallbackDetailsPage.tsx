import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { formatDistanceToNow } from 'date-fns';
import {
  BOUNCER_CALLBACK_REQUESTS,
  CLOSE_CALLBACK,
  MARK_CALLBACK_CONTACTED,
  type CallbackRequest,
} from '../../graphql/bouncer';

const STATUS_COLOR: Record<CallbackRequest['status'], 'warning' | 'primary' | 'default'> = {
  PENDING: 'warning',
  CONTACTED: 'primary',
  CLOSED: 'default',
};

export default function CallbackDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ bouncerCallbackRequests: CallbackRequest[] }>(
    BOUNCER_CALLBACK_REQUESTS,
    { fetchPolicy: 'cache-and-network' }
  );
  const [markContacted] = useMutation(MARK_CALLBACK_CONTACTED, { onCompleted: () => refetch() });
  const [closeCb] = useMutation(CLOSE_CALLBACK, { onCompleted: () => refetch() });
  const [busy, setBusy] = useState(false);

  const req = data?.bouncerCallbackRequests.find((r) => r.id === id);

  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate('/callbacks')} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Callback Request
        </Typography>
      </Stack>

      {loading && !req ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : !req ? (
        <Typography variant="body2" color="text.secondary">
          This request could not be found.
        </Typography>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {req.user.name}
                  </Typography>
                  <Chip size="small" color={STATUS_COLOR[req.status]} label={req.status} />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                </Typography>
              </Stack>

              {req.contact_phone && (
                <Link href={`tel:${req.contact_phone}`} variant="body2">
                  📞 {req.contact_phone}
                </Link>
              )}
              <Typography variant="body2">
                <strong>Pod:</strong> {req.pod?.title ?? '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Reason:</strong> {req.reason || '—'}
              </Typography>

              {req.status !== 'CLOSED' && (
                <Stack direction="row" spacing={1}>
                  {req.status === 'PENDING' && (
                    <Button
                      variant="contained"
                      disabled={busy}
                      onClick={() => run(() => markContacted({ variables: { id: req.id } }))}
                    >
                      Mark contacted
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    disabled={busy}
                    onClick={() => run(() => closeCb({ variables: { id: req.id } }))}
                  >
                    Close
                  </Button>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
