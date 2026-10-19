import { useEffect, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { useScrollUpHistory, useTranslation } from '@duncit/shell';
import ChatMessages from '../ChatMessages';
import FeedbackPanel from '../../../components/FeedbackPanel';
import JumpToLatestFab from './JumpToLatestFab';
import type { SupportChatMessage, SupportChatSession } from '../../../graphql/supportChat';

interface Props {
  session: SupportChatSession;
  messages: SupportChatMessage[];
  typingLabel: string | null;
  /** The server may hold lines above the oldest one shown. */
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
}

const NEAR_BOTTOM_PX = 80;

/** A line this console sent — the agent's own reply follows them down even when scrolled up. */
const isOwnReply = (message: SupportChatMessage): boolean =>
  message.sender_role === 'AGENT' && !message.is_ai;

/** Scrollable thread body: messages + day separators, resolved banner, user
 * feedback, typing indicator and the jump-to-latest FAB (B13). Scrolling up to
 * the top loads the page before the oldest line, keeping the agent's place. */
export default function ChatThread({
  session,
  messages,
  typingLabel,
  hasOlder,
  loadingOlder,
  onLoadOlder,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const newest = messages[messages.length - 1];
  const lastNewestId = useRef<string | undefined>(undefined);
  const history = useScrollUpHistory({
    scrollRef,
    oldestId: messages[0]?.id ?? null,
    hasMore: hasOlder,
    loading: loadingOlder,
    onLoadOlder,
  });

  const scrollToBottom = (behavior: ScrollBehavior) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // Keyed on the NEWEST line, so an older page landing above never moves the
  // agent. A new line sticks to the bottom only while the agent is already
  // there — or when it is their own reply.
  useEffect(() => {
    const previous = lastNewestId.current;
    lastNewestId.current = newest?.id;
    if (!newest || newest.id === previous) return;
    if (atBottom || isOwnReply(newest)) scrollToBottom('auto');
  }, [newest, atBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    /* v8 ignore next -- the scroll event only fires on a mounted, ref-bound element */
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distance <= NEAR_BOTTOM_PX);
    history.onScroll();
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <Box
        data-testid="chat-scroll"
        ref={scrollRef}
        onScroll={onScroll}
        aria-busy={loadingOlder}
        // The history hook holds the agent's line itself; the browser's own
        // scroll anchoring would move it a second time.
        sx={{ height: '100%', overflowY: 'auto', overflowAnchor: 'none', p: 2 }}
      >
        {loadingOlder && (
          <Box role="status" sx={{ display: 'flex', justifyContent: 'center', pb: 1.5 }}>
            <CircularProgress size={20} aria-label={t('shell.a11y.loading')} />
          </Box>
        )}
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
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontStyle: 'italic',
              pl: 1
            }}>
            {typingLabel}
          </Typography>
        )}
      </Box>
      <JumpToLatestFab show={!atBottom} onClick={() => scrollToBottom('smooth')} />
    </Box>
  );
}
