import { gql } from '@apollo/client';

export const SUPPORT_CHAT_SESSIONS = gql`
  query SupportChatSessions($status: SupportChatStatus) {
    supportChatSessions(status: $status) {
      id
      ticket_no
      status
      last_message_at
      last_message_preview
      unread_for_agent
      agent_id
      user_last_read_at
      rating
      feedback_comment
      feedback_at
      resolved_at
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
      is_ai
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
      is_ai
      created_at
    }
  }
`;

export const CLOSE_SUPPORT_CHAT = gql`
  mutation CloseSupportChat($session_id: ID!) {
    closeSupportChat(session_id: $session_id) {
      id
      status
      resolved_at
    }
  }
`;

export const REOPEN_SUPPORT_CHAT = gql`
  mutation ReopenSupportChat($session_id: ID!, $reason: String) {
    reopenSupportChat(session_id: $session_id, reason: $reason) {
      id
      status
      resolved_at
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

export const SUPPORT_CHAT_TRANSCRIPT = gql`
  query SupportChatTranscript($session_id: ID!, $format: TranscriptFormat) {
    supportChatTranscript(session_id: $session_id, format: $format) {
      filename
      text
      content_base64
    }
  }
`;

export const EMAIL_SUPPORT_CHAT_TRANSCRIPT = gql`
  mutation EmailSupportChatTranscript($session_id: ID!, $email: String!, $format: TranscriptFormat) {
    emailSupportChatTranscript(session_id: $session_id, email: $email, format: $format)
  }
`;

export type SupportChatStatus = 'OPEN' | 'CLOSED';
export type TranscriptFormat = 'TXT' | 'DOCX';

export interface SupportChatSession {
  id: string;
  ticket_no: string;
  status: SupportChatStatus;
  last_message_at: string;
  last_message_preview: string;
  unread_for_agent: number;
  agent_id: string | null;
  user_last_read_at: string | null;
  rating: number | null;
  feedback_comment: string | null;
  feedback_at: string | null;
  resolved_at: string | null;
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
  is_ai: boolean;
  created_at: string;
}

export interface SupportChatTranscript {
  filename: string;
  text: string;
  content_base64: string;
}

export const CLAIM_SUPPORT_CHAT = gql`
  mutation ClaimSupportChat($session_id: ID!) {
    claimSupportChat(session_id: $session_id) {
      id
      agent_id
      status
    }
  }
`;

export const SUPPORT_CREATE_USER = gql`
  mutation SupportCreateUser($input: SupportCreateUserInput!) {
    supportCreateUser(input: $input) {
      user_id
      full_name
      email
    }
  }
`;
