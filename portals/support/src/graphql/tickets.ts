import { gql } from '@apollo/client';

export const TICKET_FIELDS = gql`
  fragment TicketFields on Ticket {
    id
    subject
    category
    status
    priority
    assignee_id
    assignee_name
    last_message_at
    message_count
    created_at
    updated_at
    user {
      id
      name
      phone
      avatar_url
    }
  }
`;

export const TICKETS = gql`
  query Tickets($status: TicketStatus, $search: String) {
    tickets(status: $status, search: $search) {
      ...TicketFields
    }
  }
  ${TICKET_FIELDS}
`;

export const TICKET = gql`
  query Ticket($id: ID!) {
    ticket(id: $id) {
      ...TicketFields
      messages {
        id
        author_id
        author_role
        author_name
        author_photo
        body_html
        body_text
        attachments
        created_at
      }
    }
  }
  ${TICKET_FIELDS}
`;

export const REPLY_TO_TICKET = gql`
  mutation ReplyToTicket($ticket_id: ID!, $body_html: String, $body_text: String!, $attachments: [String!]) {
    replyToTicket(
      ticket_id: $ticket_id
      body_html: $body_html
      body_text: $body_text
      attachments: $attachments
    ) {
      id
      status
      last_message_at
      message_count
    }
  }
`;

export const CREATE_TICKET = gql`
  mutation CreateTicket($input: CreateTicketInput!) {
    createTicket(input: $input) {
      id
    }
  }
`;

export const UPDATE_TICKET_STATUS = gql`
  mutation UpdateTicketStatus($ticket_id: ID!, $status: TicketStatus!) {
    updateTicketStatus(ticket_id: $ticket_id, status: $status) {
      id
      status
    }
  }
`;

export type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TicketCategory = 'GENERAL' | 'PAYMENT' | 'BOOKING' | 'SAFETY' | 'TECHNICAL' | 'OTHER';

export interface TicketMessage {
  id: string;
  author_id: string;
  author_role: 'USER' | 'AGENT';
  author_name: string;
  author_photo: string | null;
  body_html: string;
  body_text: string;
  attachments: string[];
  created_at: string;
}

export interface Ticket {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  assignee_id: string | null;
  assignee_name: string | null;
  last_message_at: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  user: { id: string; name: string; phone: string | null; avatar_url: string | null };
  messages?: TicketMessage[];
}
