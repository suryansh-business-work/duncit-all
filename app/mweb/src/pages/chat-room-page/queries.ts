import { gql } from '@apollo/client';

/** One chat line, in a pod room or a club room — the bubble reads these. */
const MESSAGE_FIELDS = `
  id
  pod_id
  club_id
  user_id
  user_name
  user_photo
  type
  text
  image_url
  reactions {
    user_id
    emoji
  }
  deleted
  createdAt
  reply_to_id
  reply_to {
    id
    user_id
    user_name
    text
    type
    deleted
  }
  mentions
  mention_users {
    user_id
    full_name
  }
`;

export const POD_MESSAGES = gql`
  query PodMessages($pod_id: ID!, $limit: Int) {
    me {
      user_id
    }
    podMessages(pod_id: $pod_id, limit: $limit) { ${MESSAGE_FIELDS} }
    podChatInfo(pod_id: $pod_id) {
      chat_deletes_at
      closed
      can_moderate
      is_muted
      muted_until
    }
    pod(pod_doc_id: $pod_id) {
      id
      pod_title
      pod_date_time
      pod_end_date_time
      pod_id
      club_slug
    }
  }
`;

export const CLUB_MESSAGES = gql`
  query ClubMessages($club_id: ID!, $limit: Int) {
    me {
      user_id
    }
    clubMessages(club_id: $club_id, limit: $limit) { ${MESSAGE_FIELDS} }
    clubChatRoom(club_id: $club_id) {
      id
      club_slug
      club_name
      retention_days
      can_moderate
      is_muted
      muted_until
    }
  }
`;

/** One older page of a pod room, scrolling up: the lines alone, not the room again. */
export const POD_MESSAGE_PAGE = gql`
  query PodMessagePage($pod_id: ID!, $limit: Int, $before: String) {
    podMessages(pod_id: $pod_id, limit: $limit, before: $before) { ${MESSAGE_FIELDS} }
  }
`;

/** One older page of a club room, scrolling up: the lines alone. */
export const CLUB_MESSAGE_PAGE = gql`
  query ClubMessagePage($club_id: ID!, $limit: Int, $before: String) {
    clubMessages(club_id: $club_id, limit: $limit, before: $before) { ${MESSAGE_FIELDS} }
  }
`;

export const SEND_CLUB_MSG = gql`
  mutation SendClub(
    $club_id: ID!
    $type: PodMessageType
    $text: String
    $image_url: String
    $reply_to_id: ID
    $mentions: [ID!]
  ) {
    sendClubMessage(
      club_id: $club_id
      type: $type
      text: $text
      image_url: $image_url
      reply_to_id: $reply_to_id
      mentions: $mentions
    ) {
      id
    }
  }
`;

export const DELETE_MSG = gql`
  mutation DeleteChatMessage($message_id: ID!) {
    deletePodMessage(message_id: $message_id) {
      id
      deleted
    }
  }
`;

export const CHAT_PARTICIPANTS = gql`
  query ChatParticipants($pod_id: ID!) {
    chatParticipants(pod_id: $pod_id) {
      participant_count
      hosts {
        user_id
        full_name
        profile_photo
      }
      participants {
        user_id
        full_name
        profile_photo
      }
    }
  }
`;

export const SEND_MSG = gql`
  mutation Send(
    $pod_id: ID!
    $type: PodMessageType
    $text: String
    $image_url: String
    $reply_to_id: ID
    $mentions: [ID!]
  ) {
    sendPodMessage(
      pod_id: $pod_id
      type: $type
      text: $text
      image_url: $image_url
      reply_to_id: $reply_to_id
      mentions: $mentions
    ) {
      id
    }
  }
`;

export const REACT_MSG = gql`
  mutation React($message_id: ID!, $emoji: String!) {
    reactToPodMessage(message_id: $message_id, emoji: $emoji) {
      id
      reactions {
        user_id
        emoji
      }
    }
  }
`;

export const EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '😢', '🙏', '😮'];
