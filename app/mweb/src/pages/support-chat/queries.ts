import { gql } from '@apollo/client';

/**
 * Document-capable upload used by the chat composer. Unlike the image-only
 * UPLOAD_IMAGE, this passes allow_documents:true so the server also accepts
 * PDFs/Office/txt/csv when the real mimeType is supplied.
 */
export const UPLOAD_ATTACHMENT = gql`
  mutation UploadSupportAttachment(
    $fileBase64: String!
    $fileName: String!
    $mimeType: String
    $folder: String
    $allow_documents: Boolean
  ) {
    uploadImageToImagekit(
      fileBase64: $fileBase64
      fileName: $fileName
      mimeType: $mimeType
      folder: $folder
      allow_documents: $allow_documents
    ) {
      url
      fileId
    }
  }
`;

const SESSION_FIELDS = gql`
  fragment SupportChatSessionFields on SupportChatSession {
    id
    ticket_no
    status
    agent_id
    ai_active
    handed_off
    agent_last_read_at
    user_last_read_at
    rating
    feedback_comment
    feedback_at
    resolved_at
    reopen_deadline
  }
`;

const MESSAGE_FIELDS = gql`
  fragment SupportChatMessageFields on SupportChatMessage {
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
`;

export const MY_SUPPORT_CHAT = gql`
  query MySupportChat {
    mySupportChat {
      ...SupportChatSessionFields
    }
  }
  ${SESSION_FIELDS}
`;

export const SUPPORT_CHAT_MESSAGES = gql`
  query MySupportChatMessages($session_id: ID!, $limit: Int) {
    supportChatMessages(session_id: $session_id, limit: $limit) {
      ...SupportChatMessageFields
    }
  }
  ${MESSAGE_FIELDS}
`;

export const START_SUPPORT_CHAT = gql`
  mutation StartSupportChat($text: String) {
    startSupportChat(text: $text) {
      ...SupportChatSessionFields
    }
  }
  ${SESSION_FIELDS}
`;

export const SEND_SUPPORT_CHAT_MESSAGE = gql`
  mutation SendMySupportChatMessage($session_id: ID!, $text: String, $attachments: [String!]) {
    sendSupportChatMessage(session_id: $session_id, text: $text, attachments: $attachments) {
      ...SupportChatMessageFields
    }
  }
  ${MESSAGE_FIELDS}
`;

export const MARK_SUPPORT_CHAT_READ = gql`
  mutation MarkMySupportChatRead($session_id: ID!) {
    markSupportChatRead(session_id: $session_id) {
      id
      agent_last_read_at
    }
  }
`;

export const RESOLVE_SUPPORT_CHAT = gql`
  mutation ResolveMySupportChat($session_id: ID!) {
    resolveSupportChat(session_id: $session_id) {
      id
      status
    }
  }
`;

export const REOPEN_SUPPORT_CHAT = gql`
  mutation ReopenMySupportChat($session_id: ID!, $reason: String) {
    reopenSupportChat(session_id: $session_id, reason: $reason) {
      id
      status
      resolved_at
      reopen_deadline
    }
  }
`;

export const SUBMIT_SUPPORT_CHAT_FEEDBACK = gql`
  mutation SubmitMySupportChatFeedback($session_id: ID!, $rating: Int!, $comment: String) {
    submitSupportChatFeedback(session_id: $session_id, rating: $rating, comment: $comment) {
      id
      rating
      feedback_comment
      feedback_at
    }
  }
`;

export const SUPPORT_CHAT_TRANSCRIPT = gql`
  query MySupportChatTranscript($session_id: ID!, $format: TranscriptFormat) {
    supportChatTranscript(session_id: $session_id, format: $format) {
      filename
      text
      content_base64
    }
  }
`;

export const EMAIL_SUPPORT_CHAT_TRANSCRIPT = gql`
  mutation EmailMySupportChatTranscript($session_id: ID!, $email: String!, $format: TranscriptFormat) {
    emailSupportChatTranscript(session_id: $session_id, email: $email, format: $format)
  }
`;

/** Server export format for chat/ticket transcripts. */
export type TranscriptFormat = 'TXT' | 'DOCX';

export interface SupportChatSession {
  id: string;
  ticket_no: string;
  status: 'OPEN' | 'CLOSED';
  agent_id: string | null;
  ai_active: boolean;
  handed_off: boolean;
  agent_last_read_at: string | null;
  user_last_read_at: string | null;
  rating: number | null;
  feedback_comment: string | null;
  feedback_at: string | null;
  resolved_at: string | null;
  reopen_deadline: string | null;
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
  /** Client-only: true while an optimistic message awaits server acknowledgement. */
  pending?: boolean;
  /** Client-only: true when the optimistic send failed and can be retried (B12). */
  failed?: boolean;
}
