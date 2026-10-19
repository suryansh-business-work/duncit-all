import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { CHAT_HISTORY_PAGE, hasOlderPage } from '@duncit/utils';
import { CLUB_MESSAGE_PAGE, CLUB_MESSAGES, POD_MESSAGE_PAGE, POD_MESSAGES, SEND_CLUB_MSG, SEND_MSG } from './queries';
import type { ChatRoomKind } from './usePodSocket';
import type { ChatMessage, ClubRoomData, LinkedPod, PodRoomData } from './chat.types';
import {
  clubPageInto,
  podPageInto,
  prependOlderPage,
  refreshNewestPage,
  roomCursor,
  type ClubPage,
  type PageMerge,
  type PodPage,
} from './chatRoomPages';

export interface ChatSendInput {
  type: 'TEXT' | 'IMAGE';
  text: string;
  image_url: string | null;
}

/** Everything the room page reads, the same shape for a pod and a club. */
export interface ChatRoomSource {
  loading: boolean;
  hasData: boolean;
  refetch: () => void;
  myId?: string;
  title?: string;
  messages: ChatMessage[];
  /** Whether the server may hold lines older than the oldest loaded. */
  canLoadOlder: boolean;
  /** Puts the page before the oldest loaded line in front of it; rejects when it failed. */
  loadOlder: () => Promise<void>;
  /** No new messages: the pod has ended. A club room never closes. */
  closed: boolean;
  /** Pod rooms: when the whole room is deleted (ISO), else null. */
  deletesAt: string | null;
  /** Club rooms: messages older than this many days are deleted, else null. */
  retentionDays: number | null;
  canModerate: boolean;
  /** The linked pod (pod rooms) — for the header's "open pod" link. */
  pod: LinkedPod | null;
  /** The club's slug (club rooms) — for the header's "open club" link. */
  clubSlug: string | null;
  send: (input: ChatSendInput) => Promise<unknown>;
}

/**
 * Loads a pod's or a club's room. Exactly one of the two queries runs. It opens
 * on the newest page; older pages are fetched on request and kept in the cache
 * in front of it, so a socket refresh keeps what the reader scrolled up to.
 */
export function useChatRoomSource(kind: ChatRoomKind, id: string | undefined): ChatRoomSource {
  const isPod = kind === 'POD';
  const podQuery = useQuery<PodRoomData>(POD_MESSAGES, {
    variables: { pod_id: id, limit: CHAT_HISTORY_PAGE },
    fetchPolicy: 'cache-and-network',
    skip: !isPod || !id,
  });
  const clubQuery = useQuery<ClubRoomData>(CLUB_MESSAGES, {
    variables: { club_id: id, limit: CHAT_HISTORY_PAGE },
    fetchPolicy: 'cache-and-network',
    skip: isPod || !id,
  });
  const [sendPod] = useMutation(SEND_MSG);
  const [sendClub] = useMutation(SEND_CLUB_MSG);
  // The room whose first line has been reached: no page before it to ask for.
  const [startOf, setStartOf] = useState<string | null>(null);

  const podData = isPod ? podQuery.data : undefined;
  const clubData = isPod ? undefined : clubQuery.data;
  const active = isPod ? podQuery : clubQuery;
  const info = podData?.podChatInfo;
  const club = clubData?.clubChatRoom;
  const messages = (isPod ? podData?.podMessages : clubData?.clubMessages) ?? [];

  /**
   * One page into the cached list; resolves to the page itself. An older page
   * asks for the lines alone; a re-read of the newest page (no cursor) is the
   * whole room query, so the room's state refreshes as a refetch would.
   */
  const fetchPage = async (merge: PageMerge, before?: string): Promise<ChatMessage[]> => {
    const page = before ? { limit: CHAT_HISTORY_PAGE, before } : { limit: CHAT_HISTORY_PAGE };
    if (isPod) {
      const result = await podQuery.fetchMore<PodPage>({
        query: before ? POD_MESSAGE_PAGE : POD_MESSAGES,
        variables: { pod_id: id, ...page },
        updateQuery: podPageInto(merge),
      });
      return result.data?.podMessages ?? [];
    }
    const result = await clubQuery.fetchMore<ClubPage>({
      query: before ? CLUB_MESSAGE_PAGE : CLUB_MESSAGES,
      variables: { club_id: id, ...page },
      updateQuery: clubPageInto(merge),
    });
    return result.data?.clubMessages ?? [];
  };

  const loadOlder = async () => {
    const before = roomCursor(messages);
    if (!before) return;
    const page = await fetchPage(prependOlderPage, before);
    if (!hasOlderPage(page.length)) setStartOf(id ?? null);
  };

  // Stable on purpose: the room's socket effect lists it, and a new function
  // every render would reconnect the socket every render. Past the first page
  // a plain refetch would cut the list back to it, so the newest page is
  // re-read and merged in front of the older lines instead.
  const refresh = useRef<() => Promise<unknown>>(() => Promise.resolve());
  refresh.current =
    messages.length > CHAT_HISTORY_PAGE ? () => fetchPage(refreshNewestPage) : () => active.refetch();
  const refetch = useCallback(() => {
    refresh.current().catch(() => undefined);
  }, []);

  return {
    loading: active.loading,
    hasData: !!(podData ?? clubData),
    refetch,
    myId: (podData ?? clubData)?.me?.user_id,
    title: isPod ? podData?.pod?.pod_title : club?.club_name,
    messages,
    canLoadOlder: startOf !== id && hasOlderPage(messages.length),
    loadOlder,
    closed: isPod ? !!info?.closed : false,
    deletesAt: isPod ? (info?.chat_deletes_at ?? null) : null,
    retentionDays: isPod ? null : (club?.retention_days ?? null),
    canModerate: isPod ? !!info?.can_moderate : !!club?.can_moderate,
    pod: podData?.pod ?? null,
    clubSlug: club?.club_slug ?? null,
    send: (input) =>
      isPod
        ? sendPod({ variables: { pod_id: id, ...input } })
        : sendClub({ variables: { club_id: id, ...input } }),
  };
}
