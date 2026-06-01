import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Box,
  Button,
  ButtonGroup,
  ClickAwayListener,
  Grow,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { TEST_ENV_AI, type EnvEntry, type RichTestResult } from '../queries';
import ResultAlert from './ResultAlert';
import { parseApiError } from '../../../utils/parseApiError';

const PROVIDERS = ['OPENAI', 'GEMINI'] as const;
const LABEL: Record<string, string> = { OPENAI: 'OpenAI', GEMINI: 'Gemini' };

export default function AiTestPanel({ entry }: { entry: EnvEntry }) {
  const [prompt, setPrompt] = useState('Say hello in one short sentence.');
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>('OPENAI');
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [reply, setReply] = useState('');
  const [result, setResult] = useState<RichTestResult | null>(null);
  const [run, { loading }] = useMutation(TEST_ENV_AI);

  const send = async (p: (typeof PROVIDERS)[number]) => {
    setProvider(p);
    setMenuOpen(false);
    setResult(null);
    setReply('');
    try {
      const res = await run({ variables: { id: entry.id, provider: p, prompt } });
      const data = res.data?.testEnvAi as RichTestResult | undefined;
      setResult(data ?? null);
      if (data?.data) setReply(data.data);
    } catch (err) {
      setResult({ ok: false, message: parseApiError(err) });
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Runs a short prompt against the chosen provider using this entry's API key.
      </Typography>
      <TextField label="Prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} multiline minRows={2} fullWidth />
      <ButtonGroup variant="contained" ref={anchorRef} disabled={loading}>
        <Button onClick={() => send(provider)}>{loading ? 'Running…' : `Run with ${LABEL[provider]}`}</Button>
        <Button size="small" onClick={() => setMenuOpen((o) => !o)}><ArrowDropDownIcon /></Button>
      </ButtonGroup>
      <Popper open={menuOpen} anchorEl={anchorRef.current} transition placement="bottom-end" sx={{ zIndex: 1400 }}>
        {({ TransitionProps }) => (
          <Grow {...TransitionProps}>
            <Paper>
              <ClickAwayListener onClickAway={() => setMenuOpen(false)}>
                <MenuList>
                  {PROVIDERS.map((p) => (
                    <MenuItem key={p} selected={p === provider} onClick={() => send(p)}>
                      Run with {LABEL[p]}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
      <ResultAlert result={result} />
      {reply && (
        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, whiteSpace: 'pre-wrap' }}>
          <Typography variant="body2">{reply}</Typography>
        </Box>
      )}
    </Stack>
  );
}
