/** Param-less in-app deep-link routes reachable from a notification. */
type ParamlessRoute =
  'Earn' | 'PodIdeas' | 'VenueAutoPods' | 'HostAutoPods' | 'ClubAutoPods' | 'ChangeRequests';

/** Param-less in-app deep-link path → React Navigation screen.
 *
 * The three Auto Pod paths are the exact `link_url` values the server sends
 * when an offer starts waiting on a partner (`autoPod.notify.ts`). Without a
 * row here the push simply resolves to `none` and the tap does nothing. */
const IN_APP_ROUTES: Record<string, ParamlessRoute> = {
  '/earn': 'Earn',
  '/pod-ideas': 'PodIdeas',
  '/venues/auto-pods': 'VenueAutoPods',
  '/host/auto-pods': 'HostAutoPods',
  '/clubs/auto-pods': 'ClubAutoPods',
  // The `link_url` every Request Change notification carries — the offer, the
  // filing acknowledgement and the resolution. Without this row the tap does
  // nothing at all, silently.
  '/change-requests': 'ChangeRequests',
};

/** Resolved navigation intent for a notification's `link_url`. */
export type NotificationLinkTarget =
  | { kind: 'external'; url: string }
  | { kind: 'screen'; route: ParamlessRoute }
  | { kind: 'post'; postId: string }
  | { kind: 'pod'; clubSlug: string; podSlug: string }
  | { kind: 'none' };

/**
 * Map a notification `link_url` to a navigation intent. Shared by the in-app
 * bell and the Expo push tap handler so both deep-link identically:
 *   - http(s) → open externally
 *   - /post/:id → the PostDetail screen (post-activity notifications)
 *   - /club/:clubSlug/pod/:podSlug → PodDetails (pod like/comment notifications)
 *   - a known param-less path (e.g. /earn, /pod-ideas) → its screen
 *   - anything else → no navigation
 */
export function resolveNotificationLink(link: string | null | undefined): NotificationLinkTarget {
  if (!link) return { kind: 'none' };
  if (link.startsWith('http')) return { kind: 'external', url: link };

  const post = /^\/post\/([^/?#]+)/.exec(link);
  if (post?.[1]) return { kind: 'post', postId: post[1] };

  const pod = /^\/club\/([^/?#]+)\/pod\/([^/?#]+)/.exec(link);
  if (pod?.[1] && pod[2]) return { kind: 'pod', clubSlug: pod[1], podSlug: pod[2] };

  const route = IN_APP_ROUTES[link];
  if (route) return { kind: 'screen', route };

  return { kind: 'none' };
}
