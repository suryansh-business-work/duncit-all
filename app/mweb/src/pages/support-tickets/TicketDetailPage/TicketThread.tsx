import { useRef, useState } from 'react';
import { Box, Fab, Stack, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TicketBubble from '../TicketBubble';
import { dayLabel, showDaySeparator } from '../../support-chat/chatHelpers';
import type { TicketMessage } from '../queries';

interface Props {
  messages: readonly TicketMessage[];
  timeZone: string;
  formatTime: (iso: string) => string;
}

/** Ticket message timeline with day separators (B10) + jump-to-latest FAB (B13). */
export default function TicketThread({ messages, timeZone, formatTime }: Readonly<Props>) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showJump, setShowJump] = useState(false);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 240);
  };
  const jumpToBottom = () =>
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });

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
              <TicketBubble msg={m} timeText={formatTime(m.created_at)} />
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
}
