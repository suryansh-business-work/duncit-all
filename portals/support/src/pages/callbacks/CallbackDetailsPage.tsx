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
  TextField,
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
  const [durationMin, setDurationMin] = useState('');
  const [conclusion, setConclusion] = useState('');

  const req = data?.bouncerCallbackRequests.find((r) => r.id === id);

  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  // The agent's recorded call outcome — minutes converted to seconds for the API.
  const outcomeVars = () => {
    const mins = Number.parseFloat(durationMin);
    return {
      duration_seconds: Number.isFinite(mins) && mins > 0 ? Math.round(mins * 60) : null,
      conclusion: conclusion.trim() || null,
    };
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
              {(req.duration_seconds || req.conclusion) && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Outcome:</strong>{' '}
                  {req.duration_seconds ? `${Math.round(req.duration_seconds / 60)} min · ` : ''}
                  {req.conclusion || '—'}
                </Typography>
              )}

              {req.status !== 'CLOSED' && (
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      type="number"
                      label="Call duration (min)"
                      value={durationMin}
                      onChange={(e) => setDurationMin(e.target.value)}
                      sx={{ width: 160 }}
                      inputProps={{ min: 0 }}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      label="Conclusion"
                      value={conclusion}
                      onChange={(e) => setConclusion(e.target.value)}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    {req.status === 'PENDING' && (
                      <Button
                        variant="contained"
                        disabled={busy}
                        onClick={() =>
                          run(() => markContacted({ variables: { id: req.id, ...outcomeVars() } }))
                        }
                      >
                        Mark contacted
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      disabled={busy}
                      onClick={() => run(() => closeCb({ variables: { id: req.id, ...outcomeVars() } }))}
                    >
                      Close
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
