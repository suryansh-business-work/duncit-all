import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { TEST_ENV_GEMINI, TEST_ENV_OPENAI, type EnvEntry, type RichTestResult } from '../queries';
import ResultAlert from './ResultAlert';
import { parseApiError } from '../../../utils/parseApiError';

/** AI chat test. The provider is fixed by the entry category (OPENAI | GEMINI). */
export default function AiTestPanel({ entry }: { entry: EnvEntry }) {
  const isGemini = entry.category === 'GEMINI';
  const label = isGemini ? 'Gemini' : 'OpenAI';
  const [prompt, setPrompt] = useState('Say hello in one short sentence.');
  const [reply, setReply] = useState('');
  const [result, setResult] = useState<RichTestResult | null>(null);
  const [run, { loading }] = useMutation(isGemini ? TEST_ENV_GEMINI : TEST_ENV_OPENAI);
  const resultKey = isGemini ? 'testEnvGemini' : 'testEnvOpenai';

  const send = async () => {
    setResult(null);
    setReply('');
    try {
      const res = await run({ variables: { id: entry.id, prompt } });
      const data = (res.data as any)?.[resultKey] as RichTestResult | undefined;
      setResult(data ?? null);
      if (data?.data) setReply(data.data);
    } catch (err) {
      setResult({ ok: false, message: parseApiError(err) });
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Create a test chat against {label} using this entry's API key.
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
      <Button startIcon={<ChatIcon />} variant="contained" onClick={send} disabled={loading}>
        {loading ? 'Creating…' : `Create ${label} chat`}
      </Button>
      <ResultAlert result={result} />
      {reply && (
        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{reply}</Typography>
        </Box>
      )}
    </Stack>
  );
}
