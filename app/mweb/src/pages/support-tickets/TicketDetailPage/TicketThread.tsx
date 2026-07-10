import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, Fab, Stack, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TicketBubble from '../TicketBubble';
import { dayLabel, showDaySeparator } from '../../support-chat/chatHelpers';
import type { TicketMessage } from '../queries';

interface Props {
  messages: readonly TicketMessage[];
  timeZone: string;
  formatTime: (iso: string) => string;
  agentLastReadAt?: string | null;
}

/** Imperative handle so the parent can re-pin the thread to the latest message
 *  (e.g. right after the user sends their own reply). */
export interface TicketThreadHandle {
  pinToBottom: () => void;
}

/** Ticket message timeline with day separators (B10) + jump-to-latest FAB (B13). */
const TicketThread = forwardRef<TicketThreadHandle, Props>(function TicketThread(
  { messages, timeZone, formatTime, agentLastReadAt },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showJump, setShowJump] = useState(false);
  // Default pinned so the thread opens at the LATEST message and follows new
  // ones, unless the user has scrolled up to read history.
  const pinnedRef = useRef(true);

  useEffect(() => {
    if (!pinnedRef.current) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = distance <= 80;
    setShowJump(distance > 160);
  };
  const jumpToBottom = () => {
    pinnedRef.current = true;
    setShowJump(false);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  useImperativeHandle(ref, () => ({ pinToBottom: jumpToBottom }));

  return (
    <Box sx={{ position: 'relative' }}>
      <Box ref={scrollRef} onScroll={onScroll} sx={{ maxHeight: '52vh', overflowY: 'auto', pr: 0.5 }}>
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
              <TicketBubble msg={m} timeText={formatTime(m.created_at)} agentLastReadAt={agentLastReadAt} />
            </Box>
          ))}
        </Stack>
      </Box>
      {showJump && (
        <Fab size="small" color="primary" aria-label="Jump to latest" onClick={jumpToBottom} sx={{ position: 'absolute', right: 8, bottom: 8 }}>
          <KeyboardArrowDownIcon />
        </Fab>
      )}
    </Box>
  );
});

export default TicketThread;
