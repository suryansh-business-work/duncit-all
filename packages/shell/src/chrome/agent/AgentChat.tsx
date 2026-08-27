import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert, Box, Chip, CircularProgress, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { AgentBubble } from './AgentBubble';
import { useAgent } from './useAgent';

interface Props {
  /** False when there is no OpenAI key — the composer says so instead of failing on send. */
  isAvailable: boolean;
  /** False for a role that may talk to the agent but not have it create things. */
  canAct: boolean;
  onRegisterRestart: (restart: () => void) => void;
}

export function AgentChat({ isAvailable, canAct, onRegisterRestart }: Readonly<Props>) {
  const { t } = useTranslation();
  const { messages, error, loading, send, restart, dismissError } = useAgent();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onRegisterRestart(restart);
  }, [onRegisterRestart, restart]);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  }, [messages, loading]);

  const ask = (text: string) => {
    setDraft('');
    send(text);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask(draft);
  };

  const suggestions = [
    t('shell.agent.suggestion1'),
    t('shell.agent.suggestion2'),
    t('shell.agent.suggestion3'),
  ];

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }}>
      <Stack
        spacing={1.25}
        sx={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', px: 2, py: 1.5 }}
      >
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('shell.agent.greeting')}
        </Typography>
        {!isAvailable && <Alert severity="warning">{t('shell.agent.notConfigured')}</Alert>}
        {isAvailable && !canAct && <Alert severity="info">{t('shell.agent.readOnly')}</Alert>}

        {messages.length === 0 && isAvailable && (
          <Box>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('shell.agent.tryAsking')}
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              useFlexGap
              sx={{
                flexWrap: "wrap",
                mt: 0.5
              }}>
              {suggestions.map((suggestion) => (
                <Chip
                  key={suggestion}
                  size="small"
                  variant="outlined"
                  label={suggestion}
                  onClick={() => ask(suggestion)}
                />
              ))}
            </Stack>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: 'block',
                mt: 1
              }}>
              {t('shell.agent.capNote')}
            </Typography>
          </Box>
        )}

        {messages.map((message) => (
          <AgentBubble key={message.id} message={message} />
        ))}

        {loading && (
          <Stack direction="row" spacing={1} sx={{
            alignItems: "center"
          }}>
            <CircularProgress size={16} />
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('shell.agent.thinking')}
            </Typography>
          </Stack>
        )}
        {error && (
          <Alert severity="error" onClose={dismissError}>
            {t('shell.agent.answerError')}
          </Alert>
        )}
        <div ref={endRef} />
      </Stack>

      <Box
        component="form"
        onSubmit={submit}
        sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}
      >
        <TextField
          fullWidth
          size="small"
          value={draft}
          disabled={!isAvailable}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('shell.agent.placeholder')}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <DuncitIconButton
                    type="submit"
                    size="small"
                    edge="end"
                    disabled={loading || !draft.trim() || !isAvailable}
                    aria-label={t('shell.agent.send')}
                  >
                    <SendIcon fontSize="small" />
                  </DuncitIconButton>
                </InputAdornment>
              ),
            }
          }}
        />
      </Box>
    </Stack>
  );
}
