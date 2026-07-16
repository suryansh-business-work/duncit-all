import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button, Stack, TextField, Typography } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import { TEST_ENV_TWILIO, type EnvEntry, type RichTestResult } from '../queries';
import { PHONE_RE } from '../env-entry/env-entry.types';
import ResultAlert from './ResultAlert';
import { useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';

/** Digits-only extension dialed after the call connects (optional). */
const EXT_RE = /^\d{1,6}$/;

/** Twilio call tester — places a REAL call after confirm. */
export default function CallTestPanel({ entry }: Readonly<{ entry: EnvEntry }>) {
  const confirm = useConfirm();
  const [to, setTo] = useState('');
  const [ext, setExt] = useState('');
  const [result, setResult] = useState<RichTestResult | null>(null);
  const [run, { loading }] = useMutation(TEST_ENV_TWILIO);
  const resultKey = 'testEnvTwilioCall';

  const trimmedTo = to.trim();
  const phoneValid = PHONE_RE.test(trimmedTo);
  const phoneError = trimmedTo.length > 0 && !phoneValid;
  const trimmedExt = ext.trim();
  const extValid = trimmedExt === '' || EXT_RE.test(trimmedExt);
  const target = trimmedExt ? `${trimmedTo},${trimmedExt}` : trimmedTo;

  const call = async () => {
    const ok = await confirm({
      title: 'Place a real call?',
      message: `This will place an actual billable phone call to ${target} via ${entry.name}.`,
      confirmLabel: 'Call now',
      destructive: true,
    });
    if (!ok) return;
    setResult(null);
    try {
      const res = await run({ variables: { id: entry.id, to: target } });
      setResult((res.data as any)?.[resultKey] ?? null);
    } catch (err) {
      setResult({ ok: false, message: parseApiError(err) });
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Places a real test call from this Twilio entry.
      </Typography>
      <TextField
        label="Number to call"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="+14155552671"
        error={phoneError}
        helperText={phoneError ? 'Enter a valid E.164 number with country code, e.g. +14155552671' : 'Include the country code (e.g. +91, +1)'}
        fullWidth
        autoComplete="off"
        inputProps={{ autoComplete: 'off', inputMode: 'tel', 'data-1p-ignore': true, 'data-lpignore': true }}
      />
      <TextField
        label="Extension (optional)"
        value={ext}
        onChange={(e) => setExt(e.target.value)}
        placeholder="e.g. 101"
        error={!extValid}
        helperText={extValid ? 'Digits dialed after the call connects' : 'Extension must be 1–6 digits'}
        fullWidth
        autoComplete="off"
        inputProps={{ autoComplete: 'off', inputMode: 'numeric', 'data-1p-ignore': true, 'data-lpignore': true }}
      />
      <Button
        startIcon={<CallIcon />}
        variant="contained"
        color="warning"
        onClick={call}
        disabled={loading || !phoneValid || !extValid}
      >
        {loading ? 'Calling…' : 'Place test call'}
      </Button>
      <ResultAlert result={result} />
    </Stack>
  );
}
