import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button, Stack, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { TEST_ENV_EMAIL, type EnvEntry, type RichTestResult } from '../queries';
import ResultAlert from './ResultAlert';
import { parseApiError } from '@duncit/utils';

export default function EmailTestPanel({ entry }: Readonly<{ entry: EnvEntry }>) {
  const [to, setTo] = useState('');
  const [result, setResult] = useState<RichTestResult | null>(null);
  const [run, { loading }] = useMutation(TEST_ENV_EMAIL);

  const send = async () => {
    setResult(null);
    try {
      const res = await run({ variables: { id: entry.id, to } });
      setResult(res.data?.testEnvEmail ?? null);
    } catch (err) {
      setResult({ ok: false, message: parseApiError(err) });
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Sends a real test email through this SMTP entry.
      </Typography>
      <TextField
        label="Recipient email"
        type="email"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="someone@example.com"
        fullWidth
        autoComplete="off"
        inputProps={{ autoComplete: 'off', 'data-1p-ignore': true, 'data-lpignore': true }}
      />
      <Button startIcon={<SendIcon />} variant="contained" onClick={send} disabled={loading || !to.trim()}>
        {loading ? 'Sending…' : 'Send test email'}
      </Button>
      <ResultAlert result={result} />
    </Stack>
  );
}
