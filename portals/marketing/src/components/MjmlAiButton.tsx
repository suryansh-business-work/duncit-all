import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  CircularProgress,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';

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
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [run, { loading }] = useMutation(AI_MJML);
  const open = Boolean(anchorEl);

  const generate = async () => {
    const instruction = prompt.trim();
    /* v8 ignore next -- Apply is disabled unless prompt.trim() is truthy, so this guard never fires */
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
      /* v8 ignore next -- Apollo rejects with an Error carrying a message; the string fallback is defensive */
      setError(e?.message ?? 'Could not generate MJML');
    }
  };

  return (
    <>
      {iconOnly ? (
        <Tooltip title={t('marketing.mjmlAiButton.createUpdateWithAi')}>
          <DuncitIconButton size="small" color="secondary" onClick={(event) => setAnchorEl(event.currentTarget)}>
            <AutoAwesomeIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      ) : (
        <DuncitButton size="small" variant="outlined" color="secondary" startIcon={<AutoAwesomeIcon />} onClick={(event) => setAnchorEl(event.currentTarget)}>
          {label || 'Create/Update with AI'}
        </DuncitButton>
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
          <Typography variant="subtitle2" sx={{
            fontWeight: 700
          }}>{t('marketing.mjmlAiButton.createUpdateMjmlWithAi')}</Typography>
          <TextField
            autoFocus
            label={t('marketing.mjmlAiButton.instruction')}
            placeholder={t('marketing.mjmlAiButton.makeThisADiwaliCampaignWith')}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            multiline
            minRows={3}
            disabled={loading}
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" spacing={1} sx={{
            justifyContent: "flex-end"
          }}>
            <DuncitButton size="small" onClick={() => setAnchorEl(null)} disabled={loading}>{t('shell.common.cancel')}</DuncitButton>
            <DuncitButton size="small" variant="contained" onClick={generate} disabled={loading || !prompt.trim()} startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}>
              {loading ? 'Working...' : 'Apply'}
            </DuncitButton>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
}