import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useDebouncedValue } from '@duncit/ui';
import { CLUB_CHAT_MEMBERS } from '../../components/chat-state/queries';
import type { ChatRoomKind } from './usePodSocket';
import type { ChatMember, ChatParticipantsData, ClubChatMembersData } from './chat.types';

/** How many club members one @ search asks for. */
const CLUB_MEMBER_PAGE = 8;

/**
 * Who the @ list can offer. A pod room already loaded its hosts and
 * participants for the people panel; a club room can hold thousands of
 * followers, so it asks the server for name matches as the @word is typed.
 */
export function useRoomMembers(
  kind: ChatRoomKind,
  id: string | undefined,
  query: string | null,
  podPeople?: ChatParticipantsData['chatParticipants'] | null
): ChatMember[] {
  const search = useDebouncedValue(query ?? '', 250);
  const { data } = useQuery<ClubChatMembersData>(CLUB_CHAT_MEMBERS, {
    variables: { club_id: id, search, limit: CLUB_MEMBER_PAGE },
    skip: kind !== 'CLUB' || !id || query === null,
  });
  return useMemo(
    () =>
      kind === 'POD'
        ? [...(podPeople?.hosts ?? []), ...(podPeople?.participants ?? [])]
        : (data?.clubChatMembers ?? []),
    [kind, podPeople, data]
  );
}
