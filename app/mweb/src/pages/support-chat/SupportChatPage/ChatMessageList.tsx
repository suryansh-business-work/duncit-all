import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import ChatBubble from '../ChatBubble';
import { dayLabel, showDaySeparator } from '../chatHelpers';
import type { SupportChatMessage } from '../queries';

interface Props {
  loading: boolean;
  messages: readonly SupportChatMessage[];
  agentLastReadAt: string | null;
  timeZone: string;
  typingText: string | null;
  formatTime: (iso: string) => string;
  onRetry: (msg: SupportChatMessage) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  onScroll: () => void;
}

/** Scrollable chat transcript with day separators + a typing indicator (B10/B14a). */
export default function ChatMessageList({
  loading,
  messages,
  agentLastReadAt,
  timeZone,
  typingText,
  formatTime,
  onRetry,
  scrollRef,
  onScroll,
}: Readonly<Props>) {
  let body: React.ReactNode;
  if (loading) {
    body = (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={22} />
      </Box>
    );
  } else if (messages.length === 0) {
    body = (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
        Start a conversation — our assistant replies instantly and connects you to a human when needed.
      </Typography>
    );
  } else {
    body = (
      <Stack spacing={1.25}>
        {messages.map((m, i) => (
          <Box key={m.id}>
            {showDaySeparator(m.created_at, messages[i - 1]?.created_at, timeZone) && (
              <Stack alignItems="center" sx={{ my: 0.5 }}>
                <Typography variant="caption" sx={{ bgcolor: 'action.hover', px: 1, borderRadius: 99, fontWeight: 700 }}>
                  {dayLabel(m.created_at, timeZone)}
                </Typography>
              </Stack>
            )}
            <ChatBubble
              msg={m}
              agentLastReadAt={agentLastReadAt}
              timeText={formatTime(m.created_at)}
              onRetry={m.failed ? () => onRetry(m) : undefined}
            />
          </Box>
        ))}
        {typingText && (
          <Typography variant="caption" color="text.secondary" sx={{ pl: 1, fontStyle: 'italic' }}>
            {typingText}
          </Typography>
        )}
      </Stack>
    );
  }

  return (
    <Box ref={scrollRef} onScroll={onScroll} sx={{ flex: 1, overflowY: 'auto', px: 0.5 }}>
      {body}
    </Box>
  );
}
