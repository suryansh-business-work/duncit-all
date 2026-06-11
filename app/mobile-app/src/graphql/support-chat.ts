import { gql } from '@/generated/graphql';

/** The user's open Chat with Us session (if any). */
export const MySupportChatDocument = gql(`
  query MobileMySupportChat {
    mySupportChat {
      id
      status
      agent_id
      unread_for_user
      last_message_at
      last_message_preview
    }
  }
`);

/** Opens (or reuses) the user's chat session, optionally with a first message. */
export const StartSupportChatDocument = gql(`
  mutation MobileStartSupportChat($text: String) {
    startSupportChat(text: $text) {
      id
      status
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
      created_at
    }
  }
`);

export const SendSupportChatMessageDocument = gql(`
  mutation MobileSendSupportChatMessage($sessionId: ID!, $text: String, $attachments: [String!]) {
    sendSupportChatMessage(session_id: $sessionId, text: $text, attachments: $attachments) {
      id
      session_id
      sender_role
      text
      attachments
      created_at
    }
  }
`);

export const MarkSupportChatReadDocument = gql(`
  mutation MobileMarkSupportChatRead($sessionId: ID!) {
    markSupportChatRead(session_id: $sessionId) {
      id
      unread_for_user
    }
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
      created_at
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

export const ReplyToTicketDocument = gql(`
  mutation MobileReplyToTicket($ticketId: ID!, $bodyText: String!) {
    replyToTicket(ticket_id: $ticketId, body_text: $bodyText) {
      id
      message_count
    }
  }
`);
