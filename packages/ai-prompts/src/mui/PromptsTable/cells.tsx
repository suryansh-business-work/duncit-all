import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { usePromptCopy } from '../../i18n/useCopy';
import type { PromptCopy } from '../../copy';
import type { AiPrompt } from '../../types';

export const renderName = (p: AiPrompt, copy: PromptCopy) => (
  <Box sx={{ lineHeight: 1.3, py: 0.5 }}>
    <Stack direction="row" spacing={0.75} sx={{
      alignItems: "center"
    }}>
      <Typography variant="body2" component="div" sx={{
        fontWeight: 700
      }}>
        {p.name}
      </Typography>
      <Chip
        size="small"
        variant="outlined"
        color={p.role === 'USER' ? 'info' : 'secondary'}
        label={copy.roles[p.role]}
      />
    </Stack>
    {p.description && (
      <Typography variant="caption" component="div" sx={{
        color: "text.secondary"
      }}>
        {p.description}
      </Typography>
    )}
  </Box>
);

/** The feed address. Monospaced because it is copied into a URL, not read as prose. */
export const renderKey = (p: AiPrompt) => (
  <Typography
    variant="caption"
    sx={{
      fontFamily: "monospace",
      color: "text.secondary"
    }}>
    {p.key}
  </Typography>
);

/** Reset-to-default, on code rows only — they are the ones with a default to go back to. */
export function ResetAction({
  prompt,
  onReset,
}: Readonly<{ prompt: AiPrompt; onReset: (p: AiPrompt) => void }>) {
  const copy = usePromptCopy();
  const { t } = useTranslation();
  return (
    <Tooltip title={copy.resetHint}>
      <DuncitIconButton
        size="small"
        aria-label={t('ai.library.resetAria', { vars: { name: prompt.name } })}
        onClick={() => onReset(prompt)}
      >
        <RestartAltIcon fontSize="small" />
      </DuncitIconButton>
    </Tooltip>
  );
}

export const renderCategory = (p: AiPrompt) => <Chip size="small" variant="outlined" label={p.category} />;

export const renderModel = (p: AiPrompt, defaultModel: string) => (
  <Typography variant="body2" color={p.target_model ? 'text.primary' : 'text.secondary'}>
    {p.target_model || defaultModel}
  </Typography>
);

export const renderTokens = (p: AiPrompt, hint: string) => (
  <Tooltip title={hint}>
    <Chip size="small" color="primary" variant="outlined" label={`≈ ${p.token_count}`} />
  </Tooltip>
);
