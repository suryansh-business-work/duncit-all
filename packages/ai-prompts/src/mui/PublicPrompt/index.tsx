import { Alert, AlertTitle, Box, Chip, Container, LinearProgress, Stack, Typography } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import { DuncitButton } from '@duncit/buttons';
import { useDetailCopy } from '../../i18n/useDetailCopy';
import { PublicPromptForm } from './PublicPromptForm';
import { usePublicPrompt } from './usePublicPrompt';

export interface PublicPromptViewProps {
  /** The share token from the link (`/p/<token>`). */
  token: string;
  /** Origin of the API that serves `/ai-prompts/share`. */
  apiOrigin: string;
}

/**
 * A shared AI Library prompt, as anyone with the link sees it — no account, no
 * session. They read the prompt, fill in its blanks, add their own input, and
 * hand it to Claude, ChatGPT, Grok or Perplexity. Who wrote it and where it
 * runs inside Duncit are never shown.
 */
export function PublicPromptView({ token, apiOrigin }: Readonly<PublicPromptViewProps>) {
  const copy = useDetailCopy();
  const { state, retry, report } = usePublicPrompt(apiOrigin, token);

  return (
    <Container component="main" maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      {state.status === 'loading' && (
        <Stack spacing={1} role="status">
          <Typography variant="body2">{copy.publicPage.loading}</Typography>
          <LinearProgress aria-label={copy.publicPage.loading} />
        </Stack>
      )}
      {state.status === 'missing' && <Alert severity="info">{copy.publicPage.missing}</Alert>}
      {state.status === 'failed' && (
        <Alert
          severity="error"
          action={
            <DuncitButton color="inherit" size="small" startIcon={<ReplayIcon />} onClick={retry}>
              {copy.publicPage.retry}
            </DuncitButton>
          }
        >
          <AlertTitle>{copy.publicPage.failed}</AlertTitle>
        </Alert>
      )}
      {state.status === 'ready' && (
        <Stack spacing={3}>
          <Box component="header">
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
              {state.prompt.name}
            </Typography>
            {state.prompt.description && (
              <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {state.prompt.description}
              </Typography>
            )}
            <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Chip size="small" variant="outlined" label={copy.detail.category(state.prompt.category)} />
              <Chip size="small" color="primary" variant="outlined" label={copy.detail.tokens(state.prompt.token_count)} />
            </Stack>
          </Box>
          <PublicPromptForm prompt={state.prompt} onEvent={report} />
          <Typography variant="caption" component="footer" sx={{ color: 'text.secondary' }}>
            {copy.publicPage.footer}
          </Typography>
        </Stack>
      )}
    </Container>
  );
}
