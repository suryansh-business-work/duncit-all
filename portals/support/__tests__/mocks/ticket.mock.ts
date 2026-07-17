import type { MockedResponse } from '@apollo/client/testing';
import type { Ticket, TicketActor, TicketMessage } from '@duncit/gql-types';
import {
  CREATE_TICKET,
  EMAIL_TICKET_TRANSCRIPT,
  MARK_TICKET_READ,
  REOPEN_TICKET,
  REPLY_TO_TICKET,
  RESOLVE_TICKET,
  TICKET,
  TICKET_TRANSCRIPT,
  TICKETS,
  UPDATE_TICKET_PRIORITY,
  UPDATE_TICKET_STATUS,
} from '../../src/graphql/tickets';

/**
 * Ticket mocks. `Ticket`/`TicketActor`/`TicketMessage` come straight from the
 * generated schema; the factories provide every field the `TicketFields`
 * fragment (and detail `messages` block) select, each carrying `__typename`, so
 * nothing is "missing while writing result" under the default `addTypename`
 * cache. Mutation payloads model the narrow projection each mutation returns.
 */
// `Required<Pick<…>>` strips the property-level `?` so nullable fields are
// `T | null` (matching the app's local interfaces), not `T | null | undefined`.
export type TicketActorMock = Required<
  Pick<
    TicketActor,
    | 'id'
    | 'name'
    | 'email'
    | 'phone'
    | 'avatar_url'
    | 'city'
    | 'state'
    | 'country'
    | 'joined_at'
    | 'is_email_verified'
    | 'is_phone_verified'
  >
> & { __typename?: 'TicketActor' };

export type TicketMessageMock = Required<
  Pick<
    TicketMessage,
    | 'id'
    | 'author_id'
    | 'author_role'
    | 'author_name'
    | 'author_photo'
    | 'body_html'
    | 'body_text'
    | 'attachments'
    | 'created_at'
  >
> & { __typename?: 'TicketMessage' };

export type TicketMock = Required<
  Pick<
    Ticket,
    | 'id'
    | 'ticket_no'
    | 'subject'
    | 'category'
    | 'status'
    | 'priority'
    | 'assignee_id'
    | 'assignee_name'
    | 'last_message_at'
    | 'message_count'
    | 'resolved_at'
    | 'reopen_deadline'
    | 'rating'
    | 'feedback_comment'
    | 'feedback_at'
    | 'user_last_read_at'
    | 'agent_last_read_at'
    | 'created_at'
    | 'updated_at'
  >
> & {
  __typename?: 'Ticket';
  user: TicketActorMock;
  messages?: TicketMessageMock[];
};

export const makeTicketActor = (over: Partial<TicketActorMock> = {}): TicketActorMock => ({
  __typename: 'TicketActor',
  id: 'u1',
  name: 'Riya',
  email: 'riya@example.com',
  phone: '+919800000000',
  avatar_url: null,
  city: 'Mumbai',
  state: 'MH',
  country: 'India',
  joined_at: '2026-01-01T00:00:00.000Z',
  is_email_verified: true,
  is_phone_verified: false,
  ...over,
});

export const makeTicketMessage = (over: Partial<TicketMessageMock> = {}): TicketMessageMock => ({
  __typename: 'TicketMessage',
  id: 'm1',
  author_id: 'u1',
  author_role: 'USER',
  author_name: 'Riya',
  author_photo: null,
  body_html: '',
  body_text: 'help',
  attachments: [],
  created_at: '2026-06-26T10:00:00Z',
  ...over,
});

/** The two-message thread most detail specs start from (a user + an agent reply). */
export const baseTicketMessages = (): TicketMessageMock[] => [
  makeTicketMessage({
    id: 'm1',
    body_html: '<p>My card fails</p>',
    body_text: 'My card fails',
    attachments: ['https://img/a.png'],
    created_at: new Date().toISOString(),
  }),
  makeTicketMessage({
    id: 'm2',
    author_id: 'a1',
    author_role: 'AGENT',
    author_name: 'Agent',
    author_photo: 'x',
    body_text: 'Looking into it',
    created_at: new Date().toISOString(),
  }),
];

export const makeTicket = (over: Partial<TicketMock> = {}): TicketMock => ({
  __typename: 'Ticket',
  id: 't1',
  ticket_no: 'ST-ABC123',
  subject: 'Cannot pay',
  category: 'PAYMENT',
  status: 'OPEN',
  priority: 'MEDIUM',
  assignee_id: null,
  assignee_name: null,
  last_message_at: new Date().toISOString(),
  message_count: 2,
  resolved_at: null,
  reopen_deadline: null,
  rating: null,
  feedback_comment: null,
  feedback_at: null,
  user_last_read_at: null,
  agent_last_read_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user: makeTicketActor(),
  messages: baseTicketMessages(),
  ...over,
});

const TICKET_LIST_VARS = {
  page: 1,
  page_size: 25,
  sort_by: 'last_message_at',
  sort_dir: 'desc',
} as const;

export const ticketsListMock = (
  tickets: TicketMock[],
  over: { status?: string | null; search?: string | null } = {},
): MockedResponse => ({
  request: {
    query: TICKETS,
    variables: { status: over.status ?? null, search: over.search ?? null, ...TICKET_LIST_VARS },
  },
  result: {
    data: {
      tickets: {
        __typename: 'TicketPage',
        items: tickets,
        total: tickets.length,
        page: 1,
        page_size: 25,
      },
    },
  },
});

// Single-use (default maxUsageCount): detail specs queue a distinct ticket for
// each refetch, so the mock must advance through the sequence, not be reused.
export const ticketMock = (ticket: TicketMock | null, id = 't1'): MockedResponse => ({
  request: { query: TICKET, variables: { id } },
  result: { data: { ticket } },
});

/**
 * The page marks the thread read on open (fire-and-forget). Returns the read
 * fields matching the unmodified ticket (both null) so the mutation's cache
 * write is a no-op — it neither conflicts nor nudges the cache-and-network
 * query into a stray refetch. A spec asserting on the Seen tick passes the
 * ticket's `user_last_read_at` so the mutation preserves it.
 */
export const markTicketReadMock = (over: {
  id?: string;
  user_last_read_at?: string | null;
  agent_last_read_at?: string | null;
} = {}): MockedResponse => ({
  request: { query: MARK_TICKET_READ, variables: { ticket_id: over.id ?? 't1' } },
  result: {
    data: {
      markTicketRead: {
        __typename: 'Ticket',
        id: over.id ?? 't1',
        user_last_read_at: over.user_last_read_at ?? null,
        agent_last_read_at: over.agent_last_read_at ?? null,
      },
    },
  },
  maxUsageCount: 5,
});

export const replyToTicketMock = (id = 't1'): MockedResponse => ({
  request: { query: REPLY_TO_TICKET },
  variableMatcher: () => true,
  result: {
    data: {
      replyToTicket: {
        __typename: 'Ticket',
        id,
        status: 'PENDING',
        last_message_at: 'now',
        message_count: 3,
      },
    },
  },
});

interface StatusVars {
  id?: string;
  status: string;
  error?: string;
}

export const updateStatusMock = (over: StatusVars): MockedResponse => {
  const id = over.id ?? 't1';
  const base = { request: { query: UPDATE_TICKET_STATUS, variables: { ticket_id: id, status: over.status } } };
  if (over.error) return { ...base, error: new Error(over.error) };
  return {
    ...base,
    result: { data: { updateTicketStatus: { __typename: 'Ticket', id, status: over.status } } },
  };
};

interface PriorityVars {
  id?: string;
  priority: string;
  error?: string;
}

export const updatePriorityMock = (over: PriorityVars): MockedResponse => {
  const id = over.id ?? 't1';
  const base = {
    request: { query: UPDATE_TICKET_PRIORITY, variables: { ticket_id: id, priority: over.priority } },
  };
  if (over.error) return { ...base, error: new Error(over.error) };
  return {
    ...base,
    result: { data: { updateTicketPriority: { __typename: 'Ticket', id, priority: over.priority } } },
  };
};

export const resolveTicketMock = (over: { id?: string; error?: string } = {}): MockedResponse => {
  const id = over.id ?? 't1';
  const base = { request: { query: RESOLVE_TICKET, variables: { ticket_id: id } } };
  if (over.error) return { ...base, error: new Error(over.error) };
  return {
    ...base,
    result: {
      data: {
        resolveTicket: {
          __typename: 'Ticket',
          id,
          status: 'RESOLVED',
          resolved_at: new Date().toISOString(),
        },
      },
    },
  };
};

export const reopenTicketMock = (
  over: { id?: string; reason?: string | null } = {},
): MockedResponse => {
  const id = over.id ?? 't1';
  return {
    request: { query: REOPEN_TICKET, variables: { ticket_id: id, reason: over.reason ?? null } },
    result: {
      data: { reopenTicket: { __typename: 'Ticket', id, status: 'OPEN', resolved_at: null } },
    },
  };
};

export const createTicketMock = (id: string | null = 'new-1'): MockedResponse => ({
  request: { query: CREATE_TICKET },
  variableMatcher: () => true,
  result: { data: { createTicket: { __typename: 'Ticket', id } } },
});

export const ticketTranscriptMock = (
  over: { id?: string; format?: string; error?: string } = {},
): MockedResponse => {
  const id = over.id ?? 't1';
  const format = over.format ?? 'DOCX';
  const base = { request: { query: TICKET_TRANSCRIPT, variables: { ticket_id: id, format } } };
  if (over.error) return { ...base, error: new Error(over.error) };
  return {
    ...base,
    result: {
      data: {
        ticketTranscript: {
          __typename: 'SupportChatTranscript',
          filename: `support-ST-1.${format === 'DOCX' ? 'docx' : 'txt'}`,
          text: 't',
          content_base64: 'aGk=',
        },
      },
    },
  };
};

export const emailTicketTranscriptMock = (over: {
  id?: string;
  email: string;
  format?: string;
  error?: string;
}): MockedResponse => {
  const id = over.id ?? 't1';
  const format = over.format ?? 'DOCX';
  const base = {
    request: { query: EMAIL_TICKET_TRANSCRIPT, variables: { ticket_id: id, email: over.email, format } },
  };
  if (over.error) return { ...base, error: new Error(over.error) };
  return { ...base, result: { data: { emailTicketTranscript: true } } };
};
