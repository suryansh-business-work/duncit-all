import { useEffect, useRef, type ReactNode } from 'react';
import { Avatar, Box, ButtonBase, CircularProgress, Stack, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { useTranslation } from '@duncit/shell';
import { CRM_LEAD_AI_SUGGESTIONS } from '@duncit/utils';
import type { AskAiMessage } from '../../api/askAi.gql';

interface Props {
  messages: AskAiMessage[];
  /** The question on its way, shown until the saved pair comes back. */
  pending: string | null;
  error: string | null;
  onSuggestion: (text: string) => void;
  /** The proposals under one assistant message. */
  renderActions: (message: AskAiMessage) => ReactNode;
}

function Bubble({ role, children }: Readonly<{ role: string; children: ReactNode }>) {
  const isUser = role === 'user';
  return (
    <Stack direction={isUser ? 'row-reverse' : 'row'} spacing={1} sx={{ alignItems: 'flex-start' }}>
      <Avatar sx={{ width: 26, height: 26, bgcolor: isUser ? 'primary.main' : 'secondary.main' }}>
        {isUser ? <PersonIcon sx={{ fontSize: 16 }} /> : <SmartToyIcon sx={{ fontSize: 16 }} />}
      </Avatar>
      <Stack spacing={0.75} sx={{ maxWidth: '82%', minWidth: 0 }}>{children}</Stack>
    </Stack>
  );
}

function UserText({ text }: Readonly<{ text: string }>) {
  return (
    <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2, px: 1.5, py: 1, whiteSpace: 'pre-wrap' }}>
      <Typography variant="body2">{text}</Typography>
    </Box>
  );
}

/** The conversation: starter questions when empty, then each turn with its proposals. */
export default function AskAiMessageList({ messages, pending, error, onSuggestion, renderActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const endRef = useRef<HTMLDivElement | null>(null);
  const suggestions = CRM_LEAD_AI_SUGGESTIONS.map((key) => t(key));

  // Keep the newest turn in view, including while the assistant is thinking.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  return (
    <Stack role="log" aria-live="polite" spacing={1.5} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, bgcolor: 'action.hover' }}>
      {messages.length === 0 && !pending && (
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('crm.components.askAnythingAboutThisLeadTry')}</Typography>
          {suggestions.map((s) => (
            <ButtonBase
              key={s}
              data-testid="crm-ask-ai-suggestion"
              onClick={() => onSuggestion(s)}
              sx={{ justifyContent: 'flex-start', textAlign: 'left', bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, px: 1.25, py: 0.75, typography: 'body2' }}
            >
              {s}
            </ButtonBase>
          ))}
        </Stack>
      )}
      {messages.map((m) => (
        <Bubble key={m.id} role={m.role}>
          {m.role === 'user' ? (
            <UserText text={m.content} />
          ) : (
            <>
              <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                <DuncitRichTextInput value={m.content} onChange={() => undefined} readOnly bare />
              </Box>
              {renderActions(m)}
            </>
          )}
        </Bubble>
      ))}
      {pending && (
        <>
          <Bubble role="user"><UserText text={pending} /></Bubble>
          <Stack role="status" direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <CircularProgress size={16} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('crm.askAi.thinking')}</Typography>
          </Stack>
        </>
      )}
      {error && <Typography variant="caption" color="error" role="alert">{error}</Typography>}
      <div ref={endRef} />
    </Stack>
  );
}
