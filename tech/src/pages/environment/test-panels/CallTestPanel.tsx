import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button, Stack, TextField, Typography } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import { TEST_ENV_TWILIO, TEST_ENV_VOBIZ, type EnvEntry, type RichTestResult } from '../queries';
import ResultAlert from './ResultAlert';
import { useConfirm } from '../../../components/useConfirm';
import { parseApiError } from '../../../utils/parseApiError';

/** Shared call tester for Twilio and Vobiz — places a REAL call after confirm. */
export default function CallTestPanel({ entry }: { entry: EnvEntry }) {
  const confirm = useConfirm();
  const [to, setTo] = useState('');
  const [result, setResult] = useState<RichTestResult | null>(null);
  const mutation = entry.category === 'TWILIO' ? TEST_ENV_TWILIO : TEST_ENV_VOBIZ;
  const resultKey = entry.category === 'TWILIO' ? 'testEnvTwilioCall' : 'testEnvVobizCall';
  const [run, { loading }] = useMutation(mutation);

  const call = async () => {
    const ok = await confirm({
      title: 'Place a real call?',
      message: `This will place an actual billable phone call to ${to.trim()} via ${entry.name}.`,
      confirmLabel: 'Call now',
      destructive: true,
    });
    if (!ok) return;
    setResult(null);
    try {
      const res = await run({ variables: { id: entry.id, to } });
      setResult((res.data as any)?.[resultKey] ?? null);
    } catch (err) {
      setResult({ ok: false, message: parseApiError(err) });
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Places a real test call from this {entry.category === 'TWILIO' ? 'Twilio' : 'Vobiz'} entry.
      </Typography>
      <TextField label="Number to call" value={to} onChange={(e) => setTo(e.target.value)} placeholder="+919876543210" fullWidth autoComplete="off" inputProps={{ autoComplete: 'off', 'data-1p-ignore': true, 'data-lpignore': true }} />
      <Button startIcon={<CallIcon />} variant="contained" color="warning" onClick={call} disabled={loading || !to.trim()}>
        {loading ? 'Calling…' : 'Place test call'}
      </Button>
      <ResultAlert result={result} />
    </Stack>
  );
}
