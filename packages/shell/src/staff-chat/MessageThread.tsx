import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ThreadItem from './ThreadItem';
import { JumpToLatest, ThreadSkeleton } from './ThreadChrome';
import type { ChatFormats, ChatSettings } from './useChatSettings';
import type { StaffMessage } from './queries';

/** Today, Yesterday, or the day itself — what a separator has to say. */
function dayLabel(iso: string, day: ChatFormats['day']): string {
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
  formats: ChatFormats;
  spacing: number;
  nameOf: (userId: string) => string;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  /** A search hit to scroll to and flash. Cleared by the parent afterwards. */
  jumpToId?: string | null;
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
  jumpToId,
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
  // Keyed nodes rather than document ids: two panels on one page would collide,
  // and an id is a promise about the whole document that this does not need.
  const nodes = useRef(new Map<string, HTMLDivElement>());

  const registerNode = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      nodes.current.set(id, node);
    } else {
      nodes.current.delete(id);
    }
  }, []);
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

  // Centred, not just "into view": a hit at the very top of the box with no
  // conversation around it reads as the start of the thread rather than a hit.
  useEffect(() => {
    if (!jumpToId) return;
    nodes.current.get(jumpToId)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [jumpToId]);

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

  if (loading && messages.length === 0) return <ThreadSkeleton />;

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
            <ThreadItem
              key={message.id}
              message={message}
              meId={meId}
              settings={settings}
              formats={formats}
              nameOf={nameOf}
              repliedTo={message.reply_to_id ? (byId.get(message.reply_to_id) ?? null) : null}
              dayLabel={newDay ? day : ''}
              firstUnread={message.id === firstUnreadId}
              highlighted={message.id === jumpToId}
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
              onNode={registerNode}
            />
          );
        })}
        <div ref={endRef} />
      </Stack>

      <JumpToLatest show={!atBottom} unseen={unseen} onJump={jump} />
    </Box>
  );
}
