import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import { useScrollUpHistory } from '../../hooks/useScrollUpHistory';
import ThreadEntry, { type ThreadEntryHandlers } from '../ThreadEntry';
import { JumpToLatest, ThreadSkeleton } from '../ThreadChrome';
import type { ChatFormats, ChatSettings } from '../useChatSettings';
import { buildTimeline } from '../timeline';
import type { StaffCall, StaffMessage } from '../queries';
import { dayLabel } from './day-label';
import { ThreadLead } from './ThreadLead';

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
  const newest = messages[messages.length - 1];
  // Unset on mount, so the thread opens on its newest line rather than its oldest.
  const lastNewestId = useRef<string | undefined>(undefined);

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const history = useScrollUpHistory({
    scrollRef: scroller,
    oldestId: messages[0]?.id ?? null,
    hasMore,
    loading: loadingMore,
    onLoadOlder: onLoadMore,
  });
  const timeline = useMemo(() => buildTimeline(messages, calls), [messages, calls]);

  // The first message they have not read — where the "new" line goes.
  const firstUnreadId = useMemo(
    () => messages.find((m) => m.to_user_id === meId && !m.read_at)?.id ?? null,
    [messages, meId],
  );

  // Keyed on the NEWEST line: an older page landing above must neither move the
  // reader nor count as unseen. Your own message always follows you down.
  useEffect(() => {
    const previous = lastNewestId.current;
    lastNewestId.current = newest?.id;
    if (!newest || newest.id === previous) return;
    if (atBottom || newest.from_user_id === meId) {
      // A first page (or another conversation) jumps; an arrival glides.
      const behavior = previous && byId.has(previous) ? 'smooth' : 'auto';
      // Optional call: jsdom has the element but not the method, and a chat
      // that throws while scrolling would take the panel down with it.
      endRef.current?.scrollIntoView?.({ block: 'end', behavior });
    } else {
      setUnseen((count) => count + 1);
    }
  }, [newest, atBottom, meId, byId]);

  // Centred, not just "into view": a hit at the very top of the box with no
  // conversation around it reads as the start of the thread rather than a hit.
  useEffect(() => {
    if (!jumpToId) return;
    nodes.current.get(jumpToId)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [jumpToId]);

  const onScroll = () => {
    // Only ever wired to this element's own onScroll below — the ref is
    // already attached by the time it can fire.
    const node = scroller.current!;
    const near = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
    setAtBottom(near);
    if (near) setUnseen(0);
    // Reaching the top asks for the page before this one.
    history.onScroll();
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
        aria-busy={loadingMore}
        // `contain` keeps a wheel that hits the top or bottom of the thread from
        // carrying on into the page behind the panel. `overflowAnchor: none` because
        // the history hook keeps the reader's line in place itself.
        sx={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain', overflowAnchor: 'none', px: 1.5, py: 1 }}
      >
        <ThreadLead
          hasMore={hasMore}
          loadingMore={loadingMore}
          empty={messages.length === 0}
          onLoadMore={history.loadOlder}
        />

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
