import { gql } from '@apollo/client';

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
      last_message_at
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
  mutation ReopenMyTicket($ticket_id: ID!) {
    reopenTicket(ticket_id: $ticket_id) {
      id
      status
    }
  }
`;

export type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
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
  author_role: 'USER' | 'AGENT';
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
  last_message_at: string;
  messages: TicketMessage[];
}
