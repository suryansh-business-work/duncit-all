import { Linking } from 'react-native';
import {
  getActionFromState,
  getStateFromPath,
  type NavigationHelpers,
} from '@react-navigation/native';
import { chatRoomFromPath, venueChatPodIdFromPath, type OpenChatRoom } from '@duncit/utils';
import { logs } from '@duncit/logs';

import { linkingConfig } from '@/navigation/linkingConfig';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

/** Param-less in-app deep-link routes reachable from a notification. */
type ParamlessRoute =
  | 'Earn'
  | 'PodIdeas'
  | 'VenueAutoPods'
  | 'HostAutoPods'
  | 'ClubAutoPods'
  | 'ChangeRequests'
  | 'LiveChat';

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
  // A support reply's push (`supportChat.notify.ts`).
  '/support/live': 'LiveChat',
};

/** Resolved navigation intent for a notification's `link_url`. */
export type NotificationLinkTarget =
  | { kind: 'external'; url: string }
  | { kind: 'screen'; route: ParamlessRoute }
  | { kind: 'post'; postId: string }
  | { kind: 'pod'; clubSlug: string; podSlug: string }
  | { kind: 'podRequest'; id: string }
  | { kind: 'chat'; room: OpenChatRoom }
  | { kind: 'venueChat'; podId: string }
  | { kind: 'route'; action: NonNullable<ReturnType<typeof getActionFromState>> }
  | { kind: 'none' };

/** Deepest route a parsed path lands on — `NotFound` when the map has no screen for it. */
function leafRouteName(
  state: Parameters<typeof getActionFromState>[0] | undefined,
): string | undefined {
  const leaf = state?.routes.at(-1);
  return leaf?.state ? leafRouteName(leaf.state) : leaf?.name;
}

/**
 * Any other in-app path, through the app's own URL map — the screen a shared
 * mWeb link to the same path opens (/u/:handle, /gigs/:id, /pod-history,
 * /venues/pods, /duncit-coin …). `/` is the server's stand-in for "no link",
 * so it opens nothing rather than yanking the member back to Home.
 */
function routeForPath(path: string): NotificationLinkTarget {
  if (path === '/') return { kind: 'none' };
  try {
    const state = getStateFromPath(path, linkingConfig);
    const name = leafRouteName(state);
    if (!state || !name || name === 'NotFound') return { kind: 'none' };
    const action = getActionFromState(state, linkingConfig);
    return action ? { kind: 'route', action } : { kind: 'none' };
  } catch (error) {
    // A malformed path (e.g. a broken %-escape) must not crash the tap.
    logs.mobileApp.warn('notification-link', 'routeForPath', { error, path });
    return { kind: 'none' };
  }
}

/**
 * Map a notification `link_url` to a navigation intent. Shared by the in-app
 * bell and the Expo push tap handler so both deep-link identically:
 *   - http(s) → open externally
 *   - /post/:id → the PostDetail screen (post-activity notifications)
 *   - /club/:clubSlug/pod/:podSlug → PodDetails (pod like/comment notifications)
 *   - /pod-requests/:id → PodRequestDetail (every Pod Request notification)
 *   - /venue-chat/:podId → VenueChat (a line in a venue booking's thread)
 *   - a known param-less path (e.g. /earn, /pod-ideas) → its screen
 *   - any other path the app's URL map knows → that screen
 *   - anything else → no navigation
 */
export function resolveNotificationLink(link: string | null | undefined): NotificationLinkTarget {
  if (!link) return { kind: 'none' };
  if (link.startsWith('http')) return { kind: 'external', url: link };

  const post = /^\/post\/([^/?#]+)/.exec(link);
  if (post?.[1]) return { kind: 'post', postId: post[1] };

  const pod = /^\/club\/([^/?#]+)\/pod\/([^/?#]+)/.exec(link);
  if (pod?.[1] && pod[2]) return { kind: 'pod', clubSlug: pod[1], podSlug: pod[2] };

  const podRequest = /^\/pod-requests\/([^/?#]+)/.exec(link);
  if (podRequest?.[1]) return { kind: 'podRequest', id: podRequest[1] };

  // A pod or club room's push (`chat.notify.ts`): `/chats/:id`, `/chats/club/:id`.
  const room = chatRoomFromPath(link);
  if (room) return { kind: 'chat', room };

  // A venue booking's private thread (`venueChat.notify.ts`): `/venue-chat/:podId`.
  const venueChatPodId = venueChatPodIdFromPath(link);
  if (venueChatPodId) return { kind: 'venueChat', podId: venueChatPodId };

  const route = IN_APP_ROUTES[link];
  if (route) return { kind: 'screen', route };

  return routeForPath(link);
}

/** What opening a target needs — a screen's `navigation` prop and the
 * container's `navigationRef` both provide it. */
type LinkNavigator = Pick<NavigationHelpers<RootStackParamList>, 'navigate' | 'dispatch'>;

/**
 * Open a resolved notification target. The ONE place the bell, a push tap and
 * the app popup route through, so a new target kind cannot reach one of them
 * and silently no-op in the others (the bell and the popup both missed chat
 * rooms that way).
 */
export function openNotificationTarget(navigation: LinkNavigator, target: NotificationLinkTarget) {
  switch (target.kind) {
    case 'external':
      fireAndForget(Linking.openURL(target.url));
      return;
    case 'post':
      navigation.navigate('PostDetail', { postId: target.postId });
      return;
    case 'pod':
      navigation.navigate('PodDetails', { clubSlug: target.clubSlug, podSlug: target.podSlug });
      return;
    case 'podRequest':
      navigation.navigate('PodRequestDetail', { id: target.id });
      return;
    case 'chat':
      // The room reads its own title once it loads.
      navigation.navigate(
        'ChatRoom',
        target.room.kind === 'CLUB'
          ? { clubId: target.room.id, title: '' }
          : { podId: target.room.id, title: '' },
      );
      return;
    case 'venueChat':
      navigation.navigate('VenueChat', { podId: target.podId });
      return;
    case 'screen':
      navigation.navigate(target.route);
      return;
    case 'route':
      navigation.dispatch(target.action);
      return;
    case 'none':
      return;
  }
}
