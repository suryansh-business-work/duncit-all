import { useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { formatDistanceToNow } from 'date-fns';
import { BackHeader, StatusChip } from '@duncit/ui';
import {
  BOUNCER_CALLBACK_REQUEST,
  CLOSE_CALLBACK,
  MARK_CALLBACK_CONTACTED,
  type CallbackRequest,
} from '../../graphql/bouncer';
import { CALLBACK_STATUS_COLORS } from '../../lib/statusMaps';
import { useTranslation } from '@duncit/shell';

export default function CallbackDetailsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ bouncerCallbackRequest: CallbackRequest | null }>(
    BOUNCER_CALLBACK_REQUEST,
    { variables: { id }, fetchPolicy: 'cache-and-network', skip: !id }
  );
  const [markContacted] = useMutation<any>(MARK_CALLBACK_CONTACTED, { onCompleted: () => refetch() });
  const [closeCb] = useMutation<any>(CLOSE_CALLBACK, { onCompleted: () => refetch() });
  const [busy, setBusy] = useState(false);
  const [durationMin, setDurationMin] = useState('');
  const [conclusion, setConclusion] = useState('');

  const req = data?.bouncerCallbackRequest ?? undefined;

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

  let content: ReactNode;
  if (loading && !req) {
    content = (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  } else if (req) {
    content = (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                justifyContent: "space-between"
              }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  flexWrap: "wrap"
                }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {req.user.name}
                </Typography>
                <Chip size="small" variant="outlined" label={req.ticket_no} />
                <StatusChip status={req.status} colorMap={CALLBACK_STATUS_COLORS} />
              </Stack>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
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
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
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
                    label={t('support.callbacks.duration')}
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    sx={{ width: 160 }}
                    slotProps={{
                      htmlInput: { min: 0 }
                    }}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label={t('support.callbacks.conclusion')}
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                  />
                </Stack>
                <Stack direction="row" spacing={1}>
                  {req.status === 'PENDING' && (
                    <DuncitButton
                      variant="contained"
                      disabled={busy}
                      onClick={() =>
                        run(() => markContacted({ variables: { id: req.id, ...outcomeVars() } }))
                      }
                    >
                      Mark contacted
                    </DuncitButton>
                  )}
                  <DuncitButton
                    variant="outlined"
                    disabled={busy}
                    onClick={() => run(() => closeCb({ variables: { id: req.id, ...outcomeVars() } }))}
                  >
                    Close
                  </DuncitButton>
                </Stack>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  } else {
    content = (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        This request could not be found.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <BackHeader onBack={() => navigate('/callbacks')} title={t('support.callbacks.detailTitle')} titleWeight={800} />

      {content}
    </Stack>
  );
}
