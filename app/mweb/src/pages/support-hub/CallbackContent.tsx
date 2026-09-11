import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Paper, Stack, TextField, Typography } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import { DuncitButton } from '@duncit/buttons';
import type { SupportPodOption } from './queries';
import { SUPPORT_CALL_TARGET, REQUEST_CALLBACK, MY_CALLBACK_REQUESTS } from './queries';
import CallbackHistory from './CallbackHistory';
import { SURFACE_SX } from '../../theme';

const CARD_SX = { ...SURFACE_SX, p: 2 } as const;
const CARD_TITLE_SX = { fontSize: '1rem', fontWeight: 600 } as const;

interface Props {
  selected: SupportPodOption | null;
}

export default function CallbackContent({ selected }: Readonly<Props>) {
  const { data } = useQuery<any>(SUPPORT_CALL_TARGET, { fetchPolicy: 'cache-first' });
  const target = data?.bouncerSupportTarget;

  const [reason, setReason] = useState('');
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestCallback, { loading }] = useMutation<any>(REQUEST_CALLBACK, {
    refetchQueries: [{ query: MY_CALLBACK_REQUESTS }],
  });

  const handleCallNow = () => {
    if (!target?.available) return;
    globalThis.window.location.href = `tel:${target.phone}`;
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
      <Paper sx={CARD_SX}>
        <Stack spacing={1.25}>
          <Typography sx={CARD_TITLE_SX}>Call support now</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {target?.available
              ? `Dial ${target.phone}. We will answer in seconds.`
              : 'Support phone is not configured yet — please request a callback below.'}
          </Typography>
          <DuncitButton
            variant="contained"
            color="primary"
            size="large"
            startIcon={<CallIcon />}
            disabled={!target?.available}
            onClick={handleCallNow}
          >
            Call Now
          </DuncitButton>
        </Stack>
      </Paper>

      <Paper sx={CARD_SX}>
        <Stack spacing={1.5}>
          <Typography sx={CARD_TITLE_SX}>Request a callback</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            We will call you back on your registered phone number.
          </Typography>
          <TextField
            label="What's it about? (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            size="small"
            multiline
            minRows={2}
            slotProps={{
              htmlInput: { maxLength: 500 }
            }}
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
          <DuncitButton
            variant="outlined"
            size="large"
            startIcon={<PhoneCallbackIcon />}
            disabled={loading}
            onClick={handleRequest}
          >
            {loading ? 'Requesting…' : 'Request callback'}
          </DuncitButton>
        </Stack>
      </Paper>

      <CallbackHistory />
    </Stack>
  );
}
