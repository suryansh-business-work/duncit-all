import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Stack, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import { TEST_ENV_EMAIL, type EnvEntry, type RichTestResult } from '../queries';
import ResultAlert from './ResultAlert';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';

export default function EmailTestPanel({ entry }: Readonly<{ entry: EnvEntry }>) {
  const { t } = useTranslation();
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
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        Sends a real test email through this SMTP entry.
      </Typography>
      <TextField
        label={t('tech.environment.recipientEmail')}
        type="email"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="someone@example.com"
        fullWidth
        autoComplete="off"
        slotProps={{
          htmlInput: { autoComplete: 'off', 'data-1p-ignore': true, 'data-lpignore': true }
        }}
      />
      <DuncitButton startIcon={<SendIcon />} variant="contained" onClick={send} disabled={loading || !to.trim()}>
        {loading ? 'Sending…' : 'Send test email'}
      </DuncitButton>
      <ResultAlert result={result} />
    </Stack>
  );
}
