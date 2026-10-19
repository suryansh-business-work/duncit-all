import { gql } from '@/generated/graphql';

/** Mute, read marks, the @ list and the unread total — the pod, club and
 * support chat screens and the Chats tile hook. mWeb twin:
 * components/chat-state/queries. */

export const ChatMuteStateDocument = gql(`
  query MobileChatMuteState($kind: ChatRoomKind!, $id: ID!) {
    chatMuteState(kind: $kind, id: $id) {
      kind
      id
      is_muted
      muted_until
    }
  }
`);

export const MuteChatDocument = gql(`
  mutation MobileMuteChat($kind: ChatRoomKind!, $id: ID!, $duration: ChatMuteDuration!) {
    muteChat(kind: $kind, id: $id, duration: $duration) {
      kind
      id
      is_muted
      muted_until
    }
  }
`);

export const UnmuteChatDocument = gql(`
  mutation MobileUnmuteChat($kind: ChatRoomKind!, $id: ID!) {
    unmuteChat(kind: $kind, id: $id) {
      kind
      id
      is_muted
      muted_until
    }
  }
`);

export const MarkChatReadDocument = gql(`
  mutation MobileMarkChatRead($kind: ChatRoomKind!, $id: ID!) {
    markChatRead(kind: $kind, id: $id)
  }
`);

export const ChatUnreadTotalDocument = gql(`
  query MobileChatUnreadTotal {
    chatUnreadTotal
  }
`);

export const ClubChatMembersDocument = gql(`
  query MobileClubChatMembers($clubId: ID!, $search: String, $limit: Int) {
    clubChatMembers(club_id: $clubId, search: $search, limit: $limit) {
      user_id
      full_name
      profile_photo
    }
  }
`);
