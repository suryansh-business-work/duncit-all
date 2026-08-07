import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Divider, Fab, Skeleton, Stack, Typography, Zoom } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MessageBubble from './message-bubble';
import type { ChatSettings } from './useChatSettings';
import type { StaffMessage } from './queries';

/** Today, Yesterday, or the day itself — what a separator has to say. */
function dayLabel(iso: string, day: Intl.DateTimeFormat): string {
  const at = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(at, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(at, yesterday)) return 'Yesterday';
  return day.format(at);
}

interface Props {
  messages: StaffMessage[];
  meId: string;
  loading: boolean;
  /** More history exists above — drives the lazy load. */
  hasMore: boolean;
  loadingMore: boolean;
  settings: ChatSettings;
  formats: { time: Intl.DateTimeFormat; full: Intl.DateTimeFormat; day: Intl.DateTimeFormat };
  spacing: number;
  nameOf: (userId: string) => string;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  onLoadMore: () => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string, forEveryone: boolean) => void;
  onReact: (id: string, emoji: string) => void;
  onReply: (message: StaffMessage) => void;
  onForward: (message: StaffMessage) => void;
  onPin: (id: string) => void;
  onRetry?: (message: StaffMessage) => void;
  onNavigate?: (path: string) => void;
}

/**
 * The scrolling conversation.
 *
 * It follows the bottom only while you are already AT the bottom. Reading
 * something from an hour ago and being yanked away by an arriving message is
 * the single most irritating thing a chat can do — so when you are scrolled up,
 * new messages announce themselves with a pill and wait.
 */
export default function MessageThread({
  messages,
  meId,
  loading,
  hasMore,
  loadingMore,
  settings,
  formats,
  spacing,
  nameOf,
  selectedIds,
  onSelect,
  onLoadMore,
  onEdit,
  onDelete,
  onReact,
  onReply,
  onForward,
  onPin,
  onRetry,
  onNavigate,
}: Readonly<Props>) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const lastCount = useRef(messages.length);

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  // The first message they have not read — where the "new" line goes.
  const firstUnreadId = useMemo(
    () => messages.find((m) => m.to_user_id === meId && !m.read_at)?.id ?? null,
    [messages, meId],
  );

  useEffect(() => {
    const grew = messages.length > lastCount.current;
    lastCount.current = messages.length;
    if (!grew) return;
    if (atBottom) {
      // Optional call: jsdom has the element but not the method, and a chat
      // that throws while scrolling would take the panel down with it.
      endRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
    } else {
      setUnseen((count) => count + 1);
    }
  }, [messages, atBottom]);

  const onScroll = () => {
    const node = scroller.current;
    if (!node) return;
    const near = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
    setAtBottom(near);
    if (near) setUnseen(0);
    // Reaching the top asks for the page before this one.
    if (node.scrollTop < 40 && hasMore && !loadingMore) onLoadMore();
  };

  const jump = () => {
    endRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
    setUnseen(0);
  };

  if (loading && messages.length === 0) {
    return (
      <Stack spacing={1} sx={{ flex: 1, p: 1.5 }}>
        {[64, 40, 88, 52].map((height, index) => (
          <Skeleton
            key={height}
            variant="rounded"
            height={height}
            sx={{ maxWidth: '75%', alignSelf: index % 2 ? 'flex-end' : 'flex-start' }}
          />
        ))}
      </Stack>
    );
  }

  let lastDay = '';
  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
      <Stack
        ref={scroller}
        onScroll={onScroll}
        spacing={spacing}
        sx={{ height: '100%', overflowY: 'auto', px: 1.5, py: 1 }}
      >
        {hasMore && (
          <Box sx={{ textAlign: 'center' }}>
            <Button size="small" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Earlier messages'}
            </Button>
          </Box>
        )}

        {messages.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Say hello.
          </Typography>
        )}

        {messages.map((message) => {
          const day = message.created_at ? dayLabel(message.created_at, formats.day) : '';
          const newDay = day && day !== lastDay;
          if (newDay) lastDay = day;
          return (
            <Box key={message.id}>
              {newDay && (
                <Divider sx={{ my: 1 }}>
                  <Chip size="small" label={day} sx={{ height: 22, fontSize: 11 }} />
                </Divider>
              )}
              {message.id === firstUnreadId && (
                <Divider sx={{ my: 1 }} role="separator">
                  <Chip size="small" color="error" label="New" sx={{ height: 22, fontSize: 11 }} />
                </Divider>
              )}
              <MessageBubble
                message={message}
                mine={message.from_user_id === meId}
                meId={meId}
                settings={settings}
                formats={formats}
                nameOf={nameOf}
                repliedTo={message.reply_to_id ? (byId.get(message.reply_to_id) ?? null) : null}
                selected={selectedIds?.has(message.id)}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                onReact={onReact}
                onReply={onReply}
                onForward={onForward}
                onPin={onPin}
                onRetry={onRetry}
                onNavigate={onNavigate}
              />
            </Box>
          );
        })}
        <div ref={endRef} />
      </Stack>

      <Zoom in={!atBottom}>
        <Fab
          size="small"
          color={unseen > 0 ? 'primary' : 'default'}
          onClick={jump}
          aria-label={unseen > 0 ? `${unseen} new messages — jump to latest` : 'Jump to latest'}
          sx={{ position: 'absolute', right: 16, bottom: 12 }}
        >
          {unseen > 0 ? (
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {unseen > 9 ? '9+' : unseen}
            </Typography>
          ) : (
            <KeyboardArrowDownIcon />
          )}
        </Fab>
      </Zoom>
    </Box>
  );
}
