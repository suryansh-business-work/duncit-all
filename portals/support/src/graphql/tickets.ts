import { gql } from '@apollo/client';

export type { TranscriptFormat } from './supportChat';

export const TICKET_FIELDS = gql`
  fragment TicketFields on Ticket {
    id
    ticket_no
    subject
    category
    status
    priority
    assignee_id
    assignee_name
    last_message_at
    message_count
    resolved_at
    reopen_deadline
    rating
    feedback_comment
    feedback_at
    user_last_read_at
    agent_last_read_at
    created_at
    updated_at
    user {
      id
      name
      email
      phone
      avatar_url
      city
      state
      country
      joined_at
      is_email_verified
      is_phone_verified
    }
  }
`;

export const TICKETS = gql`
  query Tickets(
    $status: TicketStatus
    $search: String
    $page: Int
    $page_size: Int
    $sort_by: String
    $sort_dir: String
    $priority_first: TicketPriority
  ) {
    tickets(
      status: $status
      search: $search
      page: $page
      page_size: $page_size
      sort_by: $sort_by
      sort_dir: $sort_dir
      priority_first: $priority_first
    ) {
      items {
        ...TicketFields
      }
      total
      page
      page_size
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

export const MARK_TICKET_READ = gql`
  mutation MarkTicketRead($ticket_id: ID!) {
    markTicketRead(ticket_id: $ticket_id) {
      id
      user_last_read_at
      agent_last_read_at
    }
  }
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

export const UPDATE_TICKET_PRIORITY = gql`
  mutation UpdateTicketPriority($ticket_id: ID!, $priority: TicketPriority!) {
    updateTicketPriority(ticket_id: $ticket_id, priority: $priority) {
      id
      priority
    }
  }
`;

export const RESOLVE_TICKET = gql`
  mutation ResolveTicket($ticket_id: ID!) {
    resolveTicket(ticket_id: $ticket_id) {
      id
      status
      resolved_at
    }
  }
`;

export const REOPEN_TICKET = gql`
  mutation ReopenTicket($ticket_id: ID!, $reason: String) {
    reopenTicket(ticket_id: $ticket_id, reason: $reason) {
      id
      status
      resolved_at
    }
  }
`;

export const TICKET_TRANSCRIPT = gql`
  query TicketTranscript($ticket_id: ID!, $format: TranscriptFormat) {
    ticketTranscript(ticket_id: $ticket_id, format: $format) {
      filename
      text
      content_base64
    }
  }
`;

export const EMAIL_TICKET_TRANSCRIPT = gql`
  mutation EmailTicketTranscript($ticket_id: ID!, $email: String!, $format: TranscriptFormat) {
    emailTicketTranscript(ticket_id: $ticket_id, email: $email, format: $format)
  }
`;

export type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TicketCategory = 'GENERAL' | 'PAYMENT' | 'BOOKING' | 'SAFETY' | 'TECHNICAL' | 'OTHER';

export interface TicketMessage {
  id: string;
  author_id: string;
  author_role: 'USER' | 'AGENT' | 'SYSTEM';
  author_name: string;
  author_photo: string | null;
  body_html: string;
  body_text: string;
  attachments: string[];
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_no: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  assignee_id: string | null;
  assignee_name: string | null;
  last_message_at: string;
  message_count: number;
  resolved_at: string | null;
  reopen_deadline: string | null;
  rating: number | null;
  feedback_comment: string | null;
  feedback_at: string | null;
  user_last_read_at: string | null;
  agent_last_read_at: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    joined_at: string | null;
    is_email_verified: boolean;
    is_phone_verified: boolean;
  };
  messages?: TicketMessage[];
}

export interface TicketPage {
  items: Ticket[];
  total: number;
  page: number;
  page_size: number;
}

export interface TicketTranscript {
  filename: string;
  text: string;
  content_base64: string;
}
