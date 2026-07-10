import { gql } from '@/generated/graphql';

/** The user's latest Chat with Us session (any status) — drives the chat header. */
export const MySupportChatDocument = gql(`
  query MobileMySupportChat {
    mySupportChat {
      id
      ticket_no
      status
      agent_id
      ai_active
      handed_off
      agent_last_read_at
      user_last_read_at
      rating
      unread_for_user
    }
  }
`);

/** Opens (or reuses) the user's chat session, optionally with a first message. */
export const StartSupportChatDocument = gql(`
  mutation MobileStartSupportChat($text: String) {
    startSupportChat(text: $text) {
      id
      ticket_no
      status
      ai_active
      agent_id
      agent_last_read_at
      resolved_at
      reopen_deadline
      rating
      feedback_comment
    }
  }
`);

export const SupportChatMessagesDocument = gql(`
  query MobileSupportChatMessages($sessionId: ID!, $limit: Int) {
    supportChatMessages(session_id: $sessionId, limit: $limit) {
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
`);

export const SendSupportChatMessageDocument = gql(`
  mutation MobileSendSupportChatMessage($sessionId: ID!, $text: String, $attachments: [String!]) {
    sendSupportChatMessage(session_id: $sessionId, text: $text, attachments: $attachments) {
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
`);

export const MarkSupportChatReadDocument = gql(`
  mutation MobileMarkSupportChatRead($sessionId: ID!) {
    markSupportChatRead(session_id: $sessionId) {
      id
      unread_for_user
      agent_last_read_at
    }
  }
`);

export const ResolveSupportChatDocument = gql(`
  mutation MobileResolveSupportChat($sessionId: ID!) {
    resolveSupportChat(session_id: $sessionId) {
      id
      status
      resolved_at
    }
  }
`);

export const ReopenSupportChatDocument = gql(`
  mutation MobileReopenSupportChat($sessionId: ID!, $reason: String) {
    reopenSupportChat(session_id: $sessionId, reason: $reason) {
      id
      status
    }
  }
`);

export const SubmitSupportChatFeedbackDocument = gql(`
  mutation MobileSubmitSupportChatFeedback($sessionId: ID!, $rating: Int!, $comment: String) {
    submitSupportChatFeedback(session_id: $sessionId, rating: $rating, comment: $comment) {
      id
      rating
    }
  }
`);

export const SupportChatTranscriptDocument = gql(`
  query MobileSupportChatTranscript($sessionId: ID!, $format: TranscriptFormat) {
    supportChatTranscript(session_id: $sessionId, format: $format) {
      filename
      text
      content_base64
    }
  }
`);

export const EmailSupportChatTranscriptDocument = gql(`
  mutation MobileEmailSupportChatTranscript($sessionId: ID!, $email: String!, $format: TranscriptFormat) {
    emailSupportChatTranscript(session_id: $sessionId, email: $email, format: $format)
  }
`);

/** Every support item the user has raised — tickets, SOS, callbacks, chats. */
export const UnifiedSupportTicketsDocument = gql(`
  query MobileUnifiedSupportTickets {
    myUnifiedSupportTickets {
      id
      ticket_no
      title
      status
      source
      created_at
    }
  }
`);

/** One ticket with its full message thread — the ticket details screen. */
export const TicketDetailsDocument = gql(`
  query MobileTicketDetails($id: ID!) {
    ticket(id: $id) {
      id
      subject
      category
      status
      priority
      created_at
      updated_at
      last_message_at
      resolved_at
      reopen_deadline
      rating
      feedback_comment
      user_last_read_at
      agent_last_read_at
      messages {
        id
        author_role
        author_name
        body_text
        attachments
        created_at
      }
    }
  }
`);

/** Marks the ticket thread read so the other side's Sent ticks turn Seen (B12). */
export const MarkTicketReadDocument = gql(`
  mutation MobileMarkTicketRead($ticketId: ID!) {
    markTicketRead(ticket_id: $ticketId) {
      id
      user_last_read_at
      agent_last_read_at
    }
  }
`);

export const ReplyToTicketDocument = gql(`
  mutation MobileReplyToTicket($ticketId: ID!, $bodyText: String!, $attachments: [String!]) {
    replyToTicket(ticket_id: $ticketId, body_text: $bodyText, attachments: $attachments) {
      id
      status
      message_count
    }
  }
`);

export const ReopenTicketDocument = gql(`
  mutation MobileReopenTicket($ticketId: ID!, $reason: String) {
    reopenTicket(ticket_id: $ticketId, reason: $reason) {
      id
      status
    }
  }
`);

export const ResolveTicketDocument = gql(`
  mutation MobileResolveTicket($ticketId: ID!) {
    resolveTicket(ticket_id: $ticketId) {
      id
      status
    }
  }
`);

export const SubmitTicketFeedbackDocument = gql(`
  mutation MobileSubmitTicketFeedback($ticketId: ID!, $rating: Int!, $comment: String) {
    submitTicketFeedback(ticket_id: $ticketId, rating: $rating, comment: $comment) {
      id
      rating
    }
  }
`);

export const TicketTranscriptDocument = gql(`
  query MobileTicketTranscript($ticketId: ID!, $format: TranscriptFormat) {
    ticketTranscript(ticket_id: $ticketId, format: $format) {
      filename
      text
      content_base64
    }
  }
`);

export const EmailTicketTranscriptDocument = gql(`
  mutation MobileEmailTicketTranscript($ticketId: ID!, $email: String!, $format: TranscriptFormat) {
    emailTicketTranscript(ticket_id: $ticketId, email: $email, format: $format)
  }
`);
