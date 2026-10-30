import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { logs } from '@duncit/logs';
import { createChatReadMarker } from '@duncit/utils';

import { MarkVenueChatReadDocument } from '@/graphql/venue-chat';
import { useAppActive } from '@/hooks/useAppActive';
import { graphqlRequest } from '@/services/graphql.client';

/** The newest line the other side wrote, or null while they have written none. */
function newestFromOthers(
  lines: readonly { id: string; user_id: string }[],
  meId: string,
): string | null {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line && line.user_id !== meId) return line.id;
  }
  return null;
}

interface Options {
  podId: string;
  /** The thread's lines, oldest first. */
  lines: readonly { id: string; user_id: string }[];
  meId: string | null | undefined;
  /** The first page is in — reading it already marked the thread read. */
  ready: boolean;
}

/**
 * Keeps the reader's face under the newest line the other side sees: while the
 * thread is on screen and the app in front, a line from the other side marks
 * the thread read (`markVenueChatRead`, throttled by the shared
 * `createChatReadMarker`), and so does coming back to the thread — or to the
 * app — after lines arrived meanwhile. Opening it needs nothing: the first page
 * marked it. A failed mark is logged and left for the next one; a face one line
 * behind is not worth an error. mWeb twin: useVenueChatMarkRead.
 */
export function useVenueChatMarkRead({ podId, lines, meId, ready }: Options) {
  const focused = useIsFocused();
  const appActive = useAppActive();
  const send = useCallback(() => {
    graphqlRequest(MarkVenueChatReadDocument, { podId }, { auth: true }).catch((error: unknown) =>
      logs.mobileApp.warn('venueChat', 'markRead', { pod_id: podId, error }),
    );
  }, [podId]);
  const marker = useMemo(() => createChatReadMarker(send), [send]);
  useEffect(() => marker.cancel, [marker]);

  const newest = meId ? newestFromOthers(lines, meId) : null;
  // The newest line from the other side the thread was last marked read at; undefined until it is in.
  const markedAt = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!ready || !meId) return;
    if (markedAt.current === undefined) {
      markedAt.current = newest;
      return;
    }
    if (!focused || !appActive || !newest || newest === markedAt.current) return;
    markedAt.current = newest;
    marker.soon();
  }, [ready, meId, newest, focused, appActive, marker]);
}
