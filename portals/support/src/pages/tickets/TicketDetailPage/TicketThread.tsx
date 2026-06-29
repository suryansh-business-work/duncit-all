import { useEffect, useRef, useState } from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import type { Ticket } from '../../../graphql/tickets';
import { useDateFormat } from '../../../lib/useDateFormat';
import FeedbackPanel from '../../../components/FeedbackPanel';
import JumpToLatestFab from '../../live-chat/LiveChatPage/JumpToLatestFab';
import MessageBubble from './MessageBubble';
import { groupTicketMessages } from './groupTicketMessages';

const NEAR_BOTTOM_PX = 80;
const RESOLVED = new Set(['RESOLVED', 'CLOSED']);

/** Scrollable ticket thread with Today/Yesterday/date separators, the user's
 * feedback (when resolved) and a jump-to-latest FAB on long threads (B13). */
export default function TicketThread({ ticket }: Readonly<{ ticket: Ticket }>) {
  const { formatTime, dayKey, dayLabel } = useDateFormat();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const groups = groupTicketMessages(ticket.messages ?? [], dayKey, dayLabel);

  const scrollToBottom = (behavior: ScrollBehavior) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  useEffect(() => {
    if (atBottom) scrollToBottom('auto');
  }, [ticket.messages, atBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    /* v8 ignore next -- the scroll event only fires on a mounted, ref-bound element */
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX);
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <Box data-testid="ticket-scroll" ref={scrollRef} onScroll={onScroll} sx={{ height: '100%', overflowY: 'auto', pr: 0.5 }}>
        <Stack spacing={1.5}>
          {RESOLVED.has(ticket.status) && (
            <FeedbackPanel rating={ticket.rating} comment={ticket.feedback_comment} />
          )}
          {groups.map((group) => (
            <Stack key={group.key} spacing={1.5}>
              <Divider>
                <Typography variant="caption" color="text.secondary">
                  {group.label}
                </Typography>
              </Divider>
              {group.messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  time={formatTime(m.created_at)}
                  userLastReadAt={ticket.user_last_read_at}
                />
              ))}
            </Stack>
          ))}
        </Stack>
      </Box>
      <JumpToLatestFab show={!atBottom} onClick={() => scrollToBottom('smooth')} />
    </Box>
  );
}
