import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { parseApiError } from '@duncit/utils';
import { TEST_ENV_CONNECTION, type ConnectionTestResult, type EnvEntry } from '../queries';
import ResultAlert from './ResultAlert';
import { useTranslation } from '@duncit/app-settings';

/**
 * What each provider's connection test actually does, so nobody presses the
 * button wondering whether it costs anything. Keyed by the server's category
 * value; a category with no entry here falls back to the generic line.
 */
const WHAT_IT_DOES: Record<string, string> = {
  SLACK:
    'Calls Slack auth.test with this bot token and reports the workspace it belongs to, plus whether the scopes needed to list channels and post are granted.',
  SHIPROCKET:
    'Signs in to ShipRocket with this email and password and reports how long the token it issues stays valid.',
  RAZORPAY:
    'Reads one payment back with this key id and secret. Nothing is created and no money moves.',
  AISENSY:
    'Sends a REAL WhatsApp template message through this campaign. AiSensy keys can make no other call, so this is the only way to prove one works.',
  GITHUB:
    'Reads the repository back with this token to prove it is reachable. It cannot prove the token may START a workflow — the only test for that is pressing Create build.',
};

/** Only AiSensy needs somewhere to send to. */
const NEEDS_DESTINATION = 'AISENSY';

interface Props {
  entry: EnvEntry;
}

export default function ConnectionTestPanel({ entry }: Readonly<Props>) {
  const { t } = useTranslation();
  const [to, setTo] = useState('');
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [run, { loading }] = useMutation(TEST_ENV_CONNECTION);

  const needsDestination = entry.category === NEEDS_DESTINATION;
  const description =
    WHAT_IT_DOES[entry.category] ?? 'Checks these credentials against the provider.';

  const test = async () => {
    setResult(null);
    try {
      const res = await run({
        variables: { id: entry.id, input: needsDestination ? { to: to.trim() } : null },
      });
      setResult(res.data?.testEnvConnection ?? null);
    } catch (err) {
      setResult({ ok: false, message: parseApiError(err), details: [] });
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {description}
      </Typography>

      {needsDestination && (
        <>
          <Alert severity="warning">
            This sends a real WhatsApp message and is billed by AiSensy.
          </Alert>
          <TextField
            label={t('tech.environment.whatsappNumberOptional')}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={t('tech.environment.countryCodeNumberDigitsOnly')}
            helperText={t('tech.environment.leaveBlankToUseThePhone')}
            fullWidth
            autoComplete="off"
            slotProps={{
              htmlInput: { inputMode: 'numeric', autoComplete: 'off', 'data-1p-ignore': true }
            }}
          />
        </>
      )}

      <Button startIcon={<BoltIcon />} variant="contained" onClick={test} disabled={loading}>
        {loading ? 'Testing…' : 'Test connection'}
      </Button>

      <ResultAlert result={result} />
    </Stack>
  );
}
