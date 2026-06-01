import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Box, Button, ButtonGroup, Chip, Stack, TextField, Typography } from '@mui/material';
import { TEST_ENV_AI, type EnvEntry, type RichTestResult } from '../queries';
import ResultAlert from './ResultAlert';
import { parseApiError } from '../../../utils/parseApiError';

type Provider = 'OPENAI' | 'GEMINI';
const LABEL: Record<Provider, string> = { OPENAI: 'OpenAI', GEMINI: 'Gemini' };

export default function AiTestPanel({ entry }: { entry: EnvEntry }) {
  const [prompt, setPrompt] = useState('Say hello in one short sentence.');
  const [reply, setReply] = useState('');
  const [usedProvider, setUsedProvider] = useState<Provider | null>(null);
  const [result, setResult] = useState<RichTestResult | null>(null);
  const [run, { loading }] = useMutation(TEST_ENV_AI);
  const [running, setRunning] = useState<Provider | null>(null);

  const send = async (provider: Provider) => {
    setRunning(provider);
    setResult(null);
    setReply('');
    setUsedProvider(provider);
    try {
      const res = await run({ variables: { id: entry.id, provider, prompt } });
      const data = res.data?.testEnvAi as RichTestResult | undefined;
      setResult(data ?? null);
      if (data?.data) setReply(data.data);
    } catch (err) {
      setResult({ ok: false, message: parseApiError(err) });
    } finally {
      setRunning(null);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Create a test chat with either provider using this entry's API key.
      </Typography>
      <TextField
        label="Prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        multiline
        minRows={2}
        fullWidth
        autoComplete="off"
        inputProps={{ autoComplete: 'off', 'data-1p-ignore': true, 'data-lpignore': true }}
      />
      <ButtonGroup variant="contained" disabled={loading} fullWidth>
        <Button onClick={() => send('OPENAI')}>
          {running === 'OPENAI' ? 'Creating…' : 'Create OpenAI chat'}
        </Button>
        <Button onClick={() => send('GEMINI')}>
          {running === 'GEMINI' ? 'Creating…' : 'Create Gemini chat'}
        </Button>
      </ButtonGroup>
      <ResultAlert result={result} />
      {reply && (
        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
          {usedProvider && <Chip size="small" label={LABEL[usedProvider]} sx={{ mb: 1 }} />}
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{reply}</Typography>
        </Box>
      )}
    </Stack>
  );
}
