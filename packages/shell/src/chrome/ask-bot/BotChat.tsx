import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useTranslation } from '../../i18n/useTranslation';
import { BotBubble } from './BotBubble';
import type { BotCopy } from './bot-copy';
import { useAskBot } from './useAskBot';

interface Props {
  botKey: string;
  copy: BotCopy;
  /** Raised so the dialog header can offer "Start over" beside the back button. */
  onRegisterRestart: (restart: () => void) => void;
}

/**
 * The conversation with one bot: the thread, the suggestions and the composer.
 *
 * Nothing is persisted. Someone asks where a screen is, opens it and is gone —
 * a transcript would only be one more thing to clear.
 */
export function BotChat({ botKey, copy, onRegisterRestart }: Readonly<Props>) {
  const { t } = useTranslation();
  const { messages, followups, error, loading, send, restart, dismissError } = useAskBot(botKey);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onRegisterRestart(restart);
  }, [onRegisterRestart, restart]);

  useEffect(() => {
    // Optional call: jsdom has the element but not the method.
    endRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  }, [messages, loading]);

  const ask = (text: string) => {
    setDraft('');
    send(text);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    ask(draft);
  };

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }}>
      <Stack spacing={1.25} sx={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', px: 2, py: 1.5 }}>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {copy.greeting}
        </Typography>

        {messages.length === 0 && (
          <Box>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('shell.askBot.tryAsking')}
            </Typography>
            <Stack spacing={0.75} sx={{ mt: 0.75, alignItems: 'flex-start' }}>
              {copy.starters.map((starter) => (
                <Chip key={starter} label={starter} size="small" variant="outlined" onClick={() => ask(starter)} />
              ))}
            </Stack>
          </Box>
        )}

        {messages.map((message) => (
          <BotBubble key={message.id} message={message} />
        ))}

        {loading && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              color: 'text.secondary'
            }}>
            <CircularProgress size={14} />
            <Typography variant="caption">{t('shell.askBot.thinking')}</Typography>
          </Stack>
        )}

        {!loading && followups.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('shell.askBot.thenAsk')}
            </Typography>
            <Stack spacing={0.75} sx={{ mt: 0.75, alignItems: 'flex-start' }}>
              {followups.map((followup) => (
                <Chip key={followup} label={followup} size="small" variant="outlined" onClick={() => ask(followup)} />
              ))}
            </Stack>
          </Box>
        )}

        {error && (
          <Alert severity="error" onClose={dismissError}>
            {t('shell.askBot.answerError')}
          </Alert>
        )}
        <div ref={endRef} />
      </Stack>

      <Box component="form" onSubmit={submit} sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('shell.askBot.placeholder')}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    type="submit"
                    size="small"
                    edge="end"
                    disabled={loading || !draft.trim()}
                    aria-label={t('shell.askBot.send')}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }
          }}
        />
      </Box>
    </Stack>
  );
}
