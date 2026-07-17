import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  CircularProgress,
  IconButton,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const AI_MJML = gql`
  mutation AiCreateOrUpdateMjml($input: AiMjmlTemplateInput!) {
    aiCreateOrUpdateMjml(input: $input)
  }
`;

interface Props {
  currentMjml: string;
  onApply: (mjml: string) => void;
  iconOnly?: boolean;
  label?: string;
}

export default function MjmlAiButton({ currentMjml, onApply, iconOnly, label }: Readonly<Props>) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [run, { loading }] = useMutation(AI_MJML);
  const open = Boolean(anchorEl);

  const generate = async () => {
    const instruction = prompt.trim();
    /* v8 ignore next -- Apply is disabled while the prompt is empty, so this guard is unreachable via UI */
    if (!instruction) return;
    setError(null);
    try {
      const res = await run({ variables: { input: { prompt: instruction, current_mjml: currentMjml } } });
      const mjml = res.data?.aiCreateOrUpdateMjml;
      if (!mjml) throw new Error('AI did not return MJML');
      onApply(mjml);
      setPrompt('');
      setAnchorEl(null);
    } catch (e: any) {
      setError(e?.message ?? 'Could not generate MJML');
    }
  };

  return (
    <>
      {iconOnly ? (
        <Tooltip title="Create/update with AI">
          <IconButton size="small" color="secondary" onClick={(event) => setAnchorEl(event.currentTarget)}>
            <AutoAwesomeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Button size="small" variant="outlined" color="secondary" startIcon={<AutoAwesomeIcon />} onClick={(event) => setAnchorEl(event.currentTarget)}>
          {label || 'Create/Update with AI'}
        </Button>
      )}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => !loading && setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, p: 2, width: 360, maxWidth: '92vw' } } }}
      >
        <Stack spacing={1.25}>
          <Typography variant="subtitle2" fontWeight={700}>Create/update MJML with AI</Typography>
          <TextField
            autoFocus
            label="Instruction"
            placeholder="Make this a Diwali campaign with a CTA"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            multiline
            minRows={3}
            disabled={loading}
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" onClick={() => setAnchorEl(null)} disabled={loading}>Cancel</Button>
            <Button size="small" variant="contained" onClick={generate} disabled={loading || !prompt.trim()} startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}>
              {loading ? 'Working...' : 'Apply'}
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
}
