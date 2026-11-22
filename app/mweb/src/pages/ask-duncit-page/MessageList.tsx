import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Box, CircularProgress, Fab, Stack } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useTranslation } from '../../i18n/useTranslation';
import MessageBubble from './MessageBubble';
import type { Message } from './queries';
import { ROW_GAP, useChatWindow } from './useChatWindow';

interface Props {
  messages: Message[];
  hasMore: boolean;
  loadingOlder: boolean;
  /** Bumped on every send, so the person's own question scrolls into view. */
  pinKey: number;
  canRollback: boolean;
  voice: boolean;
  speakingId: string | null;
  empty: ReactNode;
  onLoadOlder: () => void;
  onDecide: (actionId: string, approve: boolean) => void;
  onRollback: (actionId: string) => void;
  onRate: (messageId: string, rating: 'UP' | 'DOWN') => void;
  onSpeak: (messageId: string, text: string) => void;
}

/**
 * The conversation: virtualized (only messages near the viewport are mounted),
 * following new text while the reader is at the bottom, loading older pages
 * when they scroll to the top, with a "move to bottom" button otherwise.
 */
export default function MessageList(props: Readonly<Props>) {
  const { messages, hasMore, loadingOlder, pinKey, empty, onLoadOlder } = props;
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const nearTop = useCallback(() => {
    if (hasMore && !loadingOlder) onLoadOlder();
  }, [hasMore, loadingOlder, onLoadOlder]);
  const ids = messages.map((m) => m.id);
  const view = useChatWindow(ids, scrollerRef, nearTop);

  const { pin } = view;
  useEffect(() => {
    pin();
  }, [pinKey, pin]);

  const rows = view.range.end >= view.range.start ? messages.slice(view.range.start, view.range.end + 1) : [];

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
      <Box
        ref={scrollerRef}
        onScroll={view.onScroll}
        data-testid="ask-duncit-messages"
        role="log"
        aria-live="polite"
        aria-label={t('askDuncit.conversationLabel')}
        sx={{ height: '100%', overflowY: 'auto', px: 1.5, py: 1.5 }}
      >
        {loadingOlder && (
          <Stack sx={{ alignItems: 'center', py: 1 }}>
            <CircularProgress size={18} aria-label={t('askDuncit.loadingOlder')} />
          </Stack>
        )}
        {messages.length === 0 ? (
          empty
        ) : (
          <>
            <Box sx={{ height: view.range.leadPad }} />
            {rows.map((message) => (
              <Box key={message.id} ref={view.measure(message.id)} sx={{ mb: `${ROW_GAP}px` }}>
                <MessageBubble
                  message={message}
                  canRollback={props.canRollback}
                  voice={props.voice}
                  speaking={props.speakingId === message.id}
                  onDecide={props.onDecide}
                  onRollback={props.onRollback}
                  onRate={props.onRate}
                  onSpeak={props.onSpeak}
                />
              </Box>
            ))}
            <Box sx={{ height: view.range.trailPad }} />
          </>
        )}
      </Box>
      {view.showJump && (
        <Fab size="small" color="primary" aria-label={t('askDuncit.moveToBottom')} onClick={view.jumpToBottom} sx={{ position: 'absolute', right: 16, bottom: 16 }}>
          <KeyboardArrowDownIcon />
        </Fab>
      )}
    </Box>
  );
}
