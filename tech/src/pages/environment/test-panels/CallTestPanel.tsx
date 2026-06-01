import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button, Stack, TextField, Typography } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import { TEST_ENV_TWILIO, TEST_ENV_VOBIZ, type EnvEntry, type RichTestResult } from '../queries';
import { PHONE_RE } from '../env-entry/env-entry.types';
import ResultAlert from './ResultAlert';
import { useConfirm } from '../../../components/useConfirm';
import { parseApiError } from '../../../utils/parseApiError';

/** Digits-only extension dialed after the call connects (optional). */
const EXT_RE = /^\d{1,6}$/;

/** Shared call tester for Twilio and Vobiz — places a REAL call after confirm. */
export default function CallTestPanel({ entry }: { entry: EnvEntry }) {
  const confirm = useConfirm();
  const [to, setTo] = useState('');
  const [ext, setExt] = useState('');
  const [result, setResult] = useState<RichTestResult | null>(null);
  const mutation = entry.category === 'TWILIO' ? TEST_ENV_TWILIO : TEST_ENV_VOBIZ;
  const resultKey = entry.category === 'TWILIO' ? 'testEnvTwilioCall' : 'testEnvVobizCall';
  const [run, { loading }] = useMutation(mutation);

  const trimmedTo = to.trim();
  const phoneValid = PHONE_RE.test(trimmedTo);
  const phoneError = trimmedTo.length > 0 && !phoneValid;
  const extValid = ext.trim() === '' || EXT_RE.test(ext.trim());
  const target = ext.trim() ? `${trimmedTo}${ext.trim() ? `,${ext.trim()}` : ''}` : trimmedTo;

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
        Places a real test call from this {entry.category === 'TWILIO' ? 'Twilio' : 'Vobiz'} entry.
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
        helperText={!extValid ? 'Extension must be 1–6 digits' : 'Digits dialed after the call connects'}
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
