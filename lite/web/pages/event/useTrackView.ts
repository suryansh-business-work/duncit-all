import { useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { LITE_TRACK_EVENT_VIEW } from '../../graphql/events';

const SEEN_KEY = 'lite_seen_events';

/** The events already counted in this browser tab session, so a refresh is not a second view. */
function markSeen(slug: string): boolean {
  try {
    const seen = new Set<string>(JSON.parse(globalThis.sessionStorage.getItem(SEEN_KEY) ?? '[]'));
    if (seen.has(slug)) return false;
    seen.add(slug);
    globalThis.sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
    return true;
  } catch {
    // Storage blocked: count the view; at worst a refresh counts twice.
    return true;
  }
}

/**
 * Count one page view for the host's Insights — once per event per tab
 * session, never for the host (the API skips hosts too). Fire and forget: a
 * failed count is logged, never shown to the visitor.
 */
export function useTrackView(slug: string | undefined, isHost: boolean): void {
  const [track] = useMutation(LITE_TRACK_EVENT_VIEW);
  useEffect(() => {
    if (!slug || isHost || !markSeen(slug)) return;
    track({ variables: { slug } }).catch((error: unknown) => console.warn('[lite] page view not counted', error));
  }, [slug, isHost, track]);
}
