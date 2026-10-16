import { useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { CLUB_MESSAGES, POD_MESSAGES, SEND_CLUB_MSG, SEND_MSG } from './queries';
import type { ChatRoomKind } from './usePodSocket';
import type { ChatMessage, ClubRoomData, LinkedPod, PodRoomData } from './chat.types';

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

const PAGE = 80;

/** Loads a pod's or a club's room. Exactly one of the two queries runs. */
export function useChatRoomSource(kind: ChatRoomKind, id: string | undefined): ChatRoomSource {
  const isPod = kind === 'POD';
  const podQuery = useQuery<PodRoomData>(POD_MESSAGES, {
    variables: { pod_id: id, limit: PAGE },
    fetchPolicy: 'cache-and-network',
    skip: !isPod || !id,
  });
  const clubQuery = useQuery<ClubRoomData>(CLUB_MESSAGES, {
    variables: { club_id: id, limit: PAGE },
    fetchPolicy: 'cache-and-network',
    skip: isPod || !id,
  });
  const [sendPod] = useMutation(SEND_MSG);
  const [sendClub] = useMutation(SEND_CLUB_MSG);

  const podData = isPod ? podQuery.data : undefined;
  const clubData = isPod ? undefined : clubQuery.data;
  const active = isPod ? podQuery : clubQuery;
  const info = podData?.podChatInfo;
  const club = clubData?.clubChatRoom;
  // Stable on purpose: the room's socket effect lists it, and a new function
  // every render would reconnect the socket every render.
  const activeRefetch = active.refetch;
  const refetch = useCallback(() => {
    activeRefetch().catch(() => undefined);
  }, [activeRefetch]);

  return {
    loading: active.loading,
    hasData: !!(podData ?? clubData),
    refetch,
    myId: (podData ?? clubData)?.me?.user_id,
    title: isPod ? podData?.pod?.pod_title : club?.club_name,
    messages: (isPod ? podData?.podMessages : clubData?.clubMessages) ?? [],
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
