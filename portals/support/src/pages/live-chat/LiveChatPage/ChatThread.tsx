import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import ChatMessages from '../ChatMessages';
import FeedbackPanel from '../../../components/FeedbackPanel';
import JumpToLatestFab from './JumpToLatestFab';
import type { SupportChatMessage, SupportChatSession } from '../../../graphql/supportChat';

interface Props {
  session: SupportChatSession;
  messages: SupportChatMessage[];
  typingLabel: string | null;
}

const NEAR_BOTTOM_PX = 80;

/** Scrollable thread body: messages + day separators, resolved banner, user
 * feedback, typing indicator and the jump-to-latest FAB (B13). */
export default function ChatThread({ session, messages, typingLabel }: Readonly<Props>) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);

  const scrollToBottom = (behavior: ScrollBehavior) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // Auto-stick to the newest message only while the agent is already at the
  // bottom — otherwise leave their scroll position untouched.
  useEffect(() => {
    if (atBottom) scrollToBottom('auto');
  }, [messages, atBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    /* v8 ignore next -- the scroll event only fires on a mounted, ref-bound element */
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distance <= NEAR_BOTTOM_PX);
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <Box data-testid="chat-scroll" ref={scrollRef} onScroll={onScroll} sx={{ height: '100%', overflowY: 'auto', p: 2 }}>
        {session.status === 'CLOSED' && (
          <Alert severity="success" sx={{ mb: 1.5 }}>
            This conversation has been marked as resolved.
          </Alert>
        )}
        <ChatMessages messages={messages} userLastReadAt={session.user_last_read_at} />
        {session.status === 'CLOSED' && (
          <Box sx={{ mt: 1.5 }}>
            <FeedbackPanel rating={session.rating} comment={session.feedback_comment} />
          </Box>
        )}
        {typingLabel && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>
            {typingLabel}
          </Typography>
        )}
      </Box>
      <JumpToLatestFab show={!atBottom} onClick={() => scrollToBottom('smooth')} />
    </Box>
  );
}
