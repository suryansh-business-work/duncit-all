import { gql } from '@apollo/client';

export type { TranscriptFormat } from '../support-chat/queries';

export const MY_TICKETS = gql`
  query MyTickets {
    myTickets {
      id
      subject
      category
      status
      last_message_at
      message_count
    }
  }
`;

export const TICKET = gql`
  query MyTicket($id: ID!) {
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
      feedback_at
      messages {
        id
        author_role
        author_name
        author_photo
        body_text
        attachments
        created_at
      }
    }
  }
`;

export const CREATE_TICKET = gql`
  mutation CreateMyTicket($input: CreateTicketInput!) {
    createTicket(input: $input) {
      id
    }
  }
`;

export const REPLY_TO_TICKET = gql`
  mutation ReplyToMyTicket($ticket_id: ID!, $body_text: String!, $attachments: [String!]) {
    replyToTicket(ticket_id: $ticket_id, body_text: $body_text, attachments: $attachments) {
      id
      status
      message_count
    }
  }
`;

export const REOPEN_TICKET = gql`
  mutation ReopenMyTicket($ticket_id: ID!, $reason: String) {
    reopenTicket(ticket_id: $ticket_id, reason: $reason) {
      id
      status
      resolved_at
      reopen_deadline
    }
  }
`;

export const RESOLVE_TICKET = gql`
  mutation ResolveMyTicket($ticket_id: ID!) {
    resolveTicket(ticket_id: $ticket_id) {
      id
      status
      resolved_at
      reopen_deadline
    }
  }
`;

export const SUBMIT_TICKET_FEEDBACK = gql`
  mutation SubmitMyTicketFeedback($ticket_id: ID!, $rating: Int!, $comment: String) {
    submitTicketFeedback(ticket_id: $ticket_id, rating: $rating, comment: $comment) {
      id
      rating
      feedback_comment
      feedback_at
    }
  }
`;

export const TICKET_TRANSCRIPT = gql`
  query MyTicketTranscript($ticket_id: ID!, $format: TranscriptFormat) {
    ticketTranscript(ticket_id: $ticket_id, format: $format) {
      filename
      text
      content_base64
    }
  }
`;

export const EMAIL_TICKET_TRANSCRIPT = gql`
  mutation EmailMyTicketTranscript($ticket_id: ID!, $email: String!, $format: TranscriptFormat) {
    emailTicketTranscript(ticket_id: $ticket_id, email: $email, format: $format)
  }
`;

export type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TicketCategory = 'GENERAL' | 'PAYMENT' | 'BOOKING' | 'SAFETY' | 'TECHNICAL' | 'OTHER';

export interface TicketListItem {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  last_message_at: string;
  message_count: number;
}

export interface TicketMessage {
  id: string;
  author_role: 'USER' | 'AGENT' | 'SYSTEM';
  author_name: string;
  author_photo: string | null;
  body_text: string;
  attachments: string[];
  created_at: string;
}

export interface TicketDetail {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  resolved_at: string | null;
  reopen_deadline: string | null;
  rating: number | null;
  feedback_comment: string | null;
  feedback_at: string | null;
  messages: TicketMessage[];
}
