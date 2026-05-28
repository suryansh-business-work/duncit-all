import { gql } from '@apollo/client';

export const SUPPORT_CHAT_SESSIONS = gql`
  query SupportChatSessions($status: SupportChatStatus) {
    supportChatSessions(status: $status) {
      id
      status
      last_message_at
      last_message_preview
      unread_for_agent
      agent_id
      user {
        id
        name
        phone
        avatar_url
      }
    }
  }
`;

export const SUPPORT_CHAT_MESSAGES = gql`
  query SupportChatMessages($session_id: ID!, $limit: Int, $before: String) {
    supportChatMessages(session_id: $session_id, limit: $limit, before: $before) {
      id
      session_id
      sender_id
      sender_role
      sender_name
      sender_photo
      text
      attachments
      created_at
    }
  }
`;

export const SEND_SUPPORT_CHAT_MESSAGE = gql`
  mutation SendSupportChatMessage($session_id: ID!, $text: String, $attachments: [String!]) {
    sendSupportChatMessage(session_id: $session_id, text: $text, attachments: $attachments) {
      id
      session_id
      sender_id
      sender_role
      sender_name
      sender_photo
      text
      attachments
      created_at
    }
  }
`;

export const CLOSE_SUPPORT_CHAT = gql`
  mutation CloseSupportChat($session_id: ID!) {
    closeSupportChat(session_id: $session_id) {
      id
      status
    }
  }
`;

export const MARK_SUPPORT_CHAT_READ = gql`
  mutation MarkSupportChatRead($session_id: ID!) {
    markSupportChatRead(session_id: $session_id) {
      id
      unread_for_agent
    }
  }
`;

export interface SupportChatSession {
  id: string;
  status: 'OPEN' | 'CLOSED';
  last_message_at: string;
  last_message_preview: string;
  unread_for_agent: number;
  agent_id: string | null;
  user: { id: string; name: string; phone: string | null; avatar_url: string | null };
}

export interface SupportChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  sender_role: 'USER' | 'AGENT' | 'SYSTEM';
  sender_name: string;
  sender_photo: string | null;
  text: string;
  attachments: string[];
  created_at: string;
}
