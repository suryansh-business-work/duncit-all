import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
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
import { GENERATE_CRM_EMAIL_MJML } from '../../api/emailSettings.gql';
import type { EmailTemplateTarget } from '../../api/emailTemplates.gql';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

interface Props {
  currentMjml: string;
  onApply: (mjml: string) => void;
  iconOnly?: boolean;
  label?: string;
  /** Which lead kind the template is for — the AI writes for that audience. */
  target?: EmailTemplateTarget | null;
}

/**
 * Generate or refine MJML from a natural-language prompt with the CRM email
 * writer (generateCrmEmailMjml): the CRM's own prompts, its brand images and
 * the template's audience. Colours stay on the shared tokens; the CRM theme is
 * applied when the email is rendered.
 */
export default function MjmlAiButton({ currentMjml, onApply, iconOnly, label, target }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [run, { loading }] = useMutation<{ generateCrmEmailMjml: string }>(GENERATE_CRM_EMAIL_MJML);
  const open = Boolean(anchorEl);

  const generate = async () => {
    // Apply is disabled until something is typed, so the instruction is never blank.
    const instruction = prompt.trim();
    setError(null);
    try {
      const res = await run({ variables: { input: { prompt: instruction, current_mjml: currentMjml, target: target ?? null } } });
      const mjml = res.data?.generateCrmEmailMjml;
      if (!mjml) throw new Error(t('crm.emailTemplates.aiNoMjml'));
      onApply(mjml);
      setPrompt('');
      setAnchorEl(null);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <>
      {iconOnly ? (
        <Tooltip title={t('crm.emailTemplates.createUpdateWithAi')}>
          <DuncitIconButton size="small" color="secondary" aria-haspopup="dialog" aria-expanded={open} onClick={(e) => setAnchorEl(e.currentTarget)}>
            <AutoAwesomeIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      ) : (
        <DuncitButton size="small" variant="outlined" color="secondary" startIcon={<AutoAwesomeIcon />} aria-haspopup="dialog" aria-expanded={open} onClick={(e) => setAnchorEl(e.currentTarget)}>
          {label || t('crm.emailTemplates.createWithAi')}
        </DuncitButton>
      )}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => !loading && setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { role: 'dialog', 'aria-label': t('crm.emailTemplates.createUpdateMjmlWithAi'), sx: { mt: 1, p: 2, width: 360, maxWidth: '92vw' } } }}
      >
        <Stack spacing={1.25}>
          <Typography component="h2" variant="subtitle2" sx={{
            fontWeight: 700
          }}>{t('crm.emailTemplates.createUpdateMjmlWithAi')}</Typography>
          <TextField
            // eslint-disable-next-line jsx-a11y/no-autofocus -- focus moves into the popover the user just opened (WCAG 2.4.3)
            autoFocus
            label={t('crm.emailTemplates.prompt')}
            placeholder={t('crm.emailTemplates.aDiwaliOfferEmailWithA')}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
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
            <DuncitButton
              size="small"
              variant="contained"
              onClick={generate}
              disabled={loading || !prompt.trim()}
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
            >
              {loading ? t('crm.common.working') : t('crm.emailTemplates.apply')}
            </DuncitButton>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
}
