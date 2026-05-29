import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import type { SupportPodOption } from './queries';
import { SUPPORT_CALL_TARGET, REQUEST_CALLBACK } from './queries';

interface Props {
  selected: SupportPodOption | null;
}

export default function CallbackContent({ selected }: Props) {
  const { data } = useQuery(SUPPORT_CALL_TARGET, { fetchPolicy: 'cache-first' });
  const target = data?.bouncerSupportTarget;

  const [reason, setReason] = useState('');
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestCallback, { loading }] = useMutation(REQUEST_CALLBACK);

  const handleCallNow = () => {
    if (!target?.available) return;
    window.location.href = `tel:${target.phone}`;
  };

  const handleRequest = async () => {
    setError(null);
    try {
      await requestCallback({
        variables: {
          input: { pod_id: selected?.podDocId ?? null, reason: reason.trim() || null },
        },
      });
      setReason('');
      setRequested(true);
    } catch (e: any) {
      setError(e?.message || 'Could not request callback.');
    }
  };

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 4 }}>
        <Stack spacing={1.25}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
            Call support now
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {target?.available
              ? `Dial ${target.phone}. We will answer in seconds.`
              : 'Support phone is not configured yet — please request a callback below.'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<CallIcon />}
            disabled={!target?.available}
            onClick={handleCallNow}
            sx={{ borderRadius: 99, fontWeight: 800 }}
          >
            Call Now
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 4 }}>
        <Stack spacing={1.5}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
            Request a callback
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We will call you back on your registered phone number.
          </Typography>
          <TextField
            label="What's it about? (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            size="small"
            multiline
            minRows={2}
            inputProps={{ maxLength: 500 }}
          />
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {requested && !error && (
            <Alert severity="success" onClose={() => setRequested(false)}>
              Callback requested. We will reach you shortly.
            </Alert>
          )}
          <Button
            variant="outlined"
            size="large"
            startIcon={<PhoneCallbackIcon />}
            disabled={loading}
            onClick={handleRequest}
            sx={{ borderRadius: 99, fontWeight: 800 }}
          >
            {loading ? 'Requesting…' : 'Request callback'}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
