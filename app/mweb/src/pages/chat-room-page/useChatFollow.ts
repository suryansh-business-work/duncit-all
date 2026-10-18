import { useEffect, useRef, useState, type RefObject } from 'react';

/** Within this many px of the end the reader counts as "at the latest". */
const PINNED_PX = 80;

interface FollowMessage {
  id: string;
  user_id?: unknown;
}

/**
 * WhatsApp-style following for a chat log: it stays on the newest message while
 * the reader is at the bottom (and always after they send), but once they scroll
 * up to read history it stops pulling them down and counts what arrives instead,
 * for the jump-to-latest button.
 */
export function useChatFollow(
  scrollRef: RefObject<HTMLDivElement | null>,
  messages: readonly FollowMessage[],
  myId: unknown,
) {
  const pinned = useRef(true);
  const seen = useRef<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unread, setUnread] = useState(0);

  const scrollToEnd = (smooth: boolean) => {
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    const newest = messages.at(-1);
    if (!newest || newest.id === seen.current) return;
    const firstLoad = seen.current === null;
    const from = messages.findIndex((m) => m.id === seen.current);
    const arrived = from < 0 ? [] : messages.slice(from + 1);
    seen.current = newest.id;
    const mine = String(newest.user_id) === String(myId);
    if (firstLoad || pinned.current || mine) {
      pinned.current = true;
      setUnread(0);
      scrollToEnd(!firstLoad);
      return;
    }
    setUnread((n) => n + arrived.filter((m) => String(m.user_id) !== String(myId)).length);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scrollToEnd only reads the ref
  }, [messages, myId]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight <= PINNED_PX;
    pinned.current = bottom;
    setAtBottom(bottom);
    if (bottom) setUnread(0);
  };

  const jumpToLatest = () => {
    pinned.current = true;
    setUnread(0);
    scrollToEnd(true);
  };

  return { atBottom, unread, onScroll, jumpToLatest };
}
