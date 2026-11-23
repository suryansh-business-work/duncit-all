import { useEffect, useRef } from 'react';
import { Paper, Stack, Typography } from '@mui/material';
import type { IntelMessage } from '@duncit/gql-types';
import type { LiveTurn } from '../../../components/ChatStream';
import AssistantMessage from './AssistantMessage';
import UserMessage from './UserMessage';

interface Props {
  messages: IntelMessage[];
  live: Readonly<Record<string, LiveTurn>>;
  pendingText: string | null;
  busy: boolean;
  onEdit: (messageId: string, text: string) => void;
  onRegenerate: () => void;
}

/** The thread, newest at the bottom, following the stream as it grows. */
export default function MessageList({ messages, live, pendingText, busy, onEdit, onRegenerate }: Readonly<Props>) {
  const end = useRef<HTMLDivElement | null>(null);
  const lastLive = messages.length ? (live[messages.at(-1)?.id ?? '']?.text.length ?? 0) : 0;
  useEffect(() => {
    end.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages.length, lastLive, pendingText]);
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'ASSISTANT');

  return (
    <Stack spacing={3} sx={{ py: 2 }} role="log" aria-live="off">
      {messages.map((m) =>
        m.role === 'USER' ? (
          <UserMessage key={m.id} content={m.content} edited={m.edited} onEdit={busy ? undefined : (text) => onEdit(m.id, text)} />
        ) : (
          <AssistantMessage key={m.id} message={m} live={live[m.id]} onRegenerate={!busy && m.id === lastAssistant?.id ? onRegenerate : undefined} />
        )
      )}
      {pendingText && (
        <Stack sx={{ alignItems: 'flex-end' }}>
          <Paper sx={{ px: 2, py: 1.25, maxWidth: { xs: '92%', md: '75%' }, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 3, opacity: 0.7 }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {pendingText}
            </Typography>
          </Paper>
        </Stack>
      )}
      <div ref={end} />
    </Stack>
  );
}
