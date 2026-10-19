import { gql } from '@apollo/client';

/** Mute, read marks, the @ list and the unread total — shared by the pod, club
 * and support chat screens and the Chats tile hook. */

const MUTE_FIELDS = `
  kind
  id
  is_muted
  muted_until
`;

export const CHAT_MUTE_STATE = gql`
  query ChatMuteState($kind: ChatRoomKind!, $id: ID!) {
    chatMuteState(kind: $kind, id: $id) { ${MUTE_FIELDS} }
  }
`;

export const MUTE_CHAT = gql`
  mutation MuteChat($kind: ChatRoomKind!, $id: ID!, $duration: ChatMuteDuration!) {
    muteChat(kind: $kind, id: $id, duration: $duration) { ${MUTE_FIELDS} }
  }
`;

export const UNMUTE_CHAT = gql`
  mutation UnmuteChat($kind: ChatRoomKind!, $id: ID!) {
    unmuteChat(kind: $kind, id: $id) { ${MUTE_FIELDS} }
  }
`;

export const MARK_CHAT_READ = gql`
  mutation MarkChatRead($kind: ChatRoomKind!, $id: ID!) {
    markChatRead(kind: $kind, id: $id)
  }
`;

export const CHAT_UNREAD_TOTAL = gql`
  query ChatUnreadTotal {
    chatUnreadTotal
  }
`;

export const CLUB_CHAT_MEMBERS = gql`
  query ClubChatMembers($club_id: ID!, $search: String, $limit: Int) {
    clubChatMembers(club_id: $club_id, search: $search, limit: $limit) {
      user_id
      full_name
      profile_photo
    }
  }
`;
