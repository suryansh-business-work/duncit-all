import { useEffect } from 'react';
import type { VenueChatLine } from '@duncit/utils';

/** Whether the reader can see the thread right now (a hidden tab has read nothing). */
const pageVisible = () => document.visibilityState === 'visible';

/**
 * Marks a venue thread read while its member is looking at it: when the newest
 * line is someone else's (it just arrived, or the thread opened on it) and the
 * tab is in view, and again whenever they come back to the tab. The other side
 * then sees the reader's face move down to that line (mWeb and Partners).
 */
export function useMarkReadWhileVisible(
  podId: string,
  lines: readonly Pick<VenueChatLine, 'id' | 'user_id'>[],
  meId: string,
  markRead: (podId: string) => Promise<void>,
) {
  const newest = lines[lines.length - 1];
  const newestFromOthers = newest && newest.user_id !== meId ? newest.id : null;

  useEffect(() => {
    if (newestFromOthers && pageVisible()) markRead(podId);
  }, [newestFromOthers, podId, markRead]);

  useEffect(() => {
    const onVisible = () => {
      if (pageVisible()) markRead(podId);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [podId, markRead]);
}
