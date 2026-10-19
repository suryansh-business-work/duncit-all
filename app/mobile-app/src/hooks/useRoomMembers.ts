import { useEffect, useState } from 'react';
import { logs } from '@duncit/logs';

import { ClubChatMembersDocument } from '@/graphql/chat-state';
import { graphqlRequest } from '@/services/graphql.client';
import type { ChatRoomKind } from '@/hooks/usePodSocket';

/** Someone the @ list can offer. */
export interface RoomMember {
  user_id: string;
  full_name: string;
  profile_photo?: string | null;
}

/** How many club members one @ search asks for, and how long typing settles first. */
const CLUB_MEMBER_PAGE = 8;
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Who the @ list can offer. A pod room already loaded its hosts and
 * participants for the people panel; a club room can hold thousands of
 * followers, so it asks the server for name matches as the @word is typed.
 * mWeb twin: chat-room-page/useRoomMembers.
 */
export function useRoomMembers(
  kind: ChatRoomKind,
  roomId: string,
  query: string | null,
  podPeople: readonly RoomMember[],
): readonly RoomMember[] {
  const [clubMembers, setClubMembers] = useState<RoomMember[]>([]);

  useEffect(() => {
    if (kind !== 'CLUB' || !roomId || query === null) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      graphqlRequest(
        ClubChatMembersDocument,
        { clubId: roomId, search: query, limit: CLUB_MEMBER_PAGE },
        { auth: true },
      )
        .then((res) => active && setClubMembers(res.clubChatMembers))
        .catch((error: unknown) => logs.mobileApp.warn('chat-room', 'clubChatMembers', { error }));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [kind, roomId, query]);

  return kind === 'POD' ? podPeople : clubMembers;
}
