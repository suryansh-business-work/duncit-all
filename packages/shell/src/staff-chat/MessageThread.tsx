import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import ThreadEntry, { type ThreadEntryHandlers } from './ThreadEntry';
import { JumpToLatest, ThreadSkeleton } from './ThreadChrome';
import type { ChatFormats, ChatSettings } from './useChatSettings';
import { buildTimeline } from './timeline';
import type { StaffCall, StaffMessage } from './queries';

/** Today, Yesterday, or the day itself — what a separator has to say. */
function dayLabel(iso: string, day: ChatFormats['day']): string {
  const at = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(at, now)) return 'shell.chat.thread.today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(at, yesterday)) return 'shell.chat.thread.yesterday';
  return day.format(at);
}

interface OwnProps {
  messages: StaffMessage[];
  /** Calls on this line, merged into the thread by time. */
  calls: StaffCall[];
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
  /** A search hit to scroll to and flash. Cleared by the parent afterwards. */
  jumpToId?: string | null;
  onLoadMore: () => void;
}

/** Everything the thread only forwards — see ThreadEntry, which consumes it. */
type Props = OwnProps & Omit<ThreadEntryHandlers, 'onNode'>;

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
  calls,
  meId,
  loading,
  hasMore,
  loadingMore,
  settings,
  formats,
  spacing,
  nameOf,
  selectedIds,
  jumpToId,
  onLoadMore,
  ...handlers
}: Readonly<Props>) {
  const { t } = useTranslation();
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
  const timeline = useMemo(() => buildTimeline(messages, calls), [messages, calls]);

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
        // `contain` keeps a wheel that hits the top or bottom of the thread from
        // carrying on into the page behind the panel.
        sx={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain', px: 1.5, py: 1 }}
      >
        {hasMore && (
          <Box sx={{ textAlign: 'center' }}>
            <DuncitButton size="small" onClick={onLoadMore} disabled={loadingMore}>
              {t(loadingMore ? 'shell.chat.thread.loading' : 'shell.chat.thread.earlier')}
            </DuncitButton>
          </Box>
        )}

        {messages.length === 0 && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              textAlign: 'center',
              py: 4
            }}>
            {t('shell.chat.thread.sayHello')}
          </Typography>
        )}

        {timeline.map((entry) => {
          const at = entry.kind === 'CALL' ? entry.call.started_at : entry.message.created_at;
          const raw = at ? dayLabel(at, formats.day) : '';
          // dayLabel returns a KEY for today/yesterday and a formatted date
          // otherwise — the date is already localised by the formatter.
          const day = raw.startsWith('shell.') ? t(raw) : raw;
          const newDay = day && day !== lastDay;
          if (newDay) lastDay = day;
          const replyId = entry.kind === 'MESSAGE' ? entry.message.reply_to_id : null;

          return (
            <ThreadEntry
              key={entry.id}
              entry={entry}
              meId={meId}
              settings={settings}
              formats={formats}
              nameOf={nameOf}
              repliedTo={replyId ? (byId.get(replyId) ?? null) : null}
              dayLabel={newDay ? day : ''}
              firstUnread={entry.kind === 'MESSAGE' && entry.message.id === firstUnreadId}
              highlighted={entry.kind === 'MESSAGE' && entry.message.id === jumpToId}
              selected={Boolean(
                entry.kind === 'MESSAGE' && selectedIds?.has(entry.message.id)
              )}
              onNode={registerNode}
              {...handlers}
            />
          );
        })}
        <div ref={endRef} />
      </Stack>

      <JumpToLatest show={!atBottom} unseen={unseen} onJump={jump} />
    </Box>
  );
}
