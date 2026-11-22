import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
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
      {p.matches_default === false && (
        <Tooltip title={copy.editedHint} describeChild>
          <Chip size="small" color="warning" variant="outlined" label={copy.edited} />
        </Tooltip>
      )}
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
