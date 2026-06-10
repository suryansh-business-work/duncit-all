import { gql } from '@apollo/client';

export const MY_SUPPORT_CHAT = gql`
  query MySupportChat {
    mySupportChat {
      id
      status
    }
  }
`;

export const SUPPORT_CHAT_MESSAGES = gql`
  query MySupportChatMessages($session_id: ID!, $limit: Int) {
    supportChatMessages(session_id: $session_id, limit: $limit) {
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

export const START_SUPPORT_CHAT = gql`
  mutation StartSupportChat($text: String) {
    startSupportChat(text: $text) {
      id
      status
    }
  }
`;

export const SEND_SUPPORT_CHAT_MESSAGE = gql`
  mutation SendMySupportChatMessage($session_id: ID!, $text: String, $attachments: [String!]) {
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

export const MARK_SUPPORT_CHAT_READ = gql`
  mutation MarkMySupportChatRead($session_id: ID!) {
    markSupportChatRead(session_id: $session_id) {
      id
    }
  }
`;

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
