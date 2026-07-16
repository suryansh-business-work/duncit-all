import type { MockedResponse } from '@apollo/client/testing';
import type {
  SupportChatMessage,
  SupportChatSession,
  SupportChatUser,
  SupportCreateUserInput,
} from '@duncit/gql-types';
import {
  CLAIM_SUPPORT_CHAT,
  CLOSE_SUPPORT_CHAT,
  EMAIL_SUPPORT_CHAT_TRANSCRIPT,
  MARK_SUPPORT_CHAT_READ,
  REOPEN_SUPPORT_CHAT,
  SEND_SUPPORT_CHAT_MESSAGE,
  SUPPORT_CHAT_MESSAGES,
  SUPPORT_CHAT_SESSIONS,
  SUPPORT_CHAT_TRANSCRIPT,
  SUPPORT_CREATE_USER,
} from '../../src/graphql/supportChat';

/**
 * Live-chat mocks. `SupportChatSession`/`SupportChatMessage`/`SupportChatUser`
 * come from the generated schema (the session list selects a 13-field
 * projection of the ~24-field session type), each factory carrying
 * `__typename` so the default `addTypename` cache normalises like production.
 */
// `Required<Pick<…>>` strips the property-level `?` so nullable fields are
// `T | null` (matching the app's local interfaces the components consume), not
// `T | null | undefined`, while staying bound to the generated schema.
export type SupportChatUserMock = Required<
  Pick<SupportChatUser, 'id' | 'name' | 'phone' | 'avatar_url'>
> & { __typename?: 'SupportChatUser' };

export type SupportChatSessionMock = Required<
  Pick<
    SupportChatSession,
    | 'id'
    | 'ticket_no'
    | 'status'
    | 'last_message_at'
    | 'last_message_preview'
    | 'unread_for_agent'
    | 'agent_id'
    | 'user_last_read_at'
    | 'rating'
    | 'feedback_comment'
    | 'feedback_at'
    | 'resolved_at'
  >
> & { __typename?: 'SupportChatSession'; user: SupportChatUserMock };

export type SupportChatMessageMock = Required<
  Pick<
    SupportChatMessage,
    | 'id'
    | 'session_id'
    | 'sender_id'
    | 'sender_role'
    | 'sender_name'
    | 'sender_photo'
    | 'text'
    | 'attachments'
    | 'is_ai'
    | 'created_at'
  >
> & { __typename?: 'SupportChatMessage' };

export const makeSupportChatUser = (over: Partial<SupportChatUserMock> = {}): SupportChatUserMock => ({
  __typename: 'SupportChatUser',
  id: 'u-s',
  name: 'Riya',
  phone: '+919800000000',
  avatar_url: null,
  ...over,
});

export const makeSupportChatSession = (
  over: Partial<SupportChatSessionMock> = {},
): SupportChatSessionMock => ({
  __typename: 'SupportChatSession',
  id: 's',
  ticket_no: 'CH-S',
  status: 'OPEN',
  last_message_at: new Date().toISOString(),
  last_message_preview: 'hi',
  unread_for_agent: 0,
  agent_id: null,
  user_last_read_at: null,
  rating: null,
  feedback_comment: null,
  feedback_at: null,
  resolved_at: null,
  user: makeSupportChatUser(),
  ...over,
});

/** Positional convenience matching the domain: id, name, then session overrides. */
export const session = (
  id: string,
  name: string,
  over: Partial<SupportChatSessionMock> = {},
): SupportChatSessionMock =>
  makeSupportChatSession({
    id,
    ticket_no: `CH-${id.toUpperCase()}`,
    user: makeSupportChatUser({ id: `u-${id}`, name }),
    ...over,
  });

export const makeSupportChatMessage = (
  over: Partial<SupportChatMessageMock> = {},
): SupportChatMessageMock => ({
  __typename: 'SupportChatMessage',
  id: 'm1',
  session_id: 's',
  sender_id: 'x',
  sender_role: 'USER',
  sender_name: 'X',
  sender_photo: null,
  text: 'hi',
  attachments: [],
  is_ai: false,
  created_at: '2026-06-26T10:00:00Z',
  ...over,
});

/** Positional helper: id, session, role, text, then overrides (is_ai, attachments…). */
export const chatMessage = (
  id: string,
  sessionId: string,
  role: SupportChatMessageMock['sender_role'],
  text: string,
  over: Partial<SupportChatMessageMock> = {},
): SupportChatMessageMock =>
  makeSupportChatMessage({ id, session_id: sessionId, sender_role: role, text, ...over });

export const sessionsMock = (
  items: SupportChatSessionMock[],
  status = 'OPEN',
): MockedResponse => ({
  request: {
    query: SUPPORT_CHAT_SESSIONS,
    variables: { status, search: null, page: 1, page_size: 25 },
  },
  result: {
    data: {
      supportChatSessions: {
        __typename: 'SupportChatSessionPage',
        items,
        total: items.length,
        page: 1,
        page_size: 25,
      },
    },
  },
  maxUsageCount: 40,
});

/** Answers every session query regardless of page/search/page_size variables. */
export const anySessionsMock = (
  items: SupportChatSessionMock[],
  total: number,
): MockedResponse => ({
  request: { query: SUPPORT_CHAT_SESSIONS },
  variableMatcher: () => true,
  result: {
    data: {
      supportChatSessions: {
        __typename: 'SupportChatSessionPage',
        items,
        total,
        page: 1,
        page_size: 25,
      },
    },
  },
  maxUsageCount: 50,
});

export const messagesMock = (
  sessionId: string,
  messages: SupportChatMessageMock[],
): MockedResponse => ({
  request: { query: SUPPORT_CHAT_MESSAGES, variables: { session_id: sessionId, limit: 100 } },
  result: { data: { supportChatMessages: messages } },
  maxUsageCount: 10,
});

/**
 * The page claims an unclaimed, open session on select (fire-and-forget).
 * Returns the session with an agent so it normalises to "claimed"; used by the
 * spec that exercises selecting a `agent_id: null` session.
 */
export const claimChatMock = (sessionId: string): MockedResponse => ({
  request: { query: CLAIM_SUPPORT_CHAT, variables: { session_id: sessionId } },
  result: {
    data: {
      claimSupportChat: {
        __typename: 'SupportChatSession',
        id: sessionId,
        agent_id: 'a1',
        status: 'OPEN',
      },
    },
  },
  maxUsageCount: 10,
});

export const markReadMock = (sessionId: string): MockedResponse => ({
  request: { query: MARK_SUPPORT_CHAT_READ, variables: { session_id: sessionId } },
  result: {
    data: {
      markSupportChatRead: {
        __typename: 'SupportChatSession',
        id: sessionId,
        unread_for_agent: 0,
      },
    },
  },
  maxUsageCount: 10,
});

export const sendMessageMock = (
  over: { message?: SupportChatMessageMock | null; onVars?: (vars: Record<string, unknown>) => void } = {},
): MockedResponse => ({
  request: { query: SEND_SUPPORT_CHAT_MESSAGE },
  variableMatcher: (vars) => {
    over.onVars?.(vars);
    return true;
  },
  result: {
    data: {
      sendSupportChatMessage:
        over.message === undefined ? chatMessage('echo', 'sess-a', 'AGENT', 'Reply') : over.message,
    },
  },
  maxUsageCount: 10,
});

export const closeChatMock = (over: { id?: string; error?: string } = {}): MockedResponse => {
  const id = over.id ?? 'sess-a';
  const base = { request: { query: CLOSE_SUPPORT_CHAT, variables: { session_id: id } } };
  if (over.error) return { ...base, error: new Error(over.error) };
  return {
    ...base,
    result: {
      data: {
        closeSupportChat: {
          __typename: 'SupportChatSession',
          id,
          status: 'CLOSED',
          resolved_at: new Date().toISOString(),
        },
      },
    },
  };
};

export const reopenChatMock = (
  over: { id?: string; reason?: string | null } = {},
): MockedResponse => {
  const id = over.id ?? 'sess-c';
  return {
    request: { query: REOPEN_SUPPORT_CHAT, variables: { session_id: id, reason: over.reason ?? null } },
    result: {
      data: {
        reopenSupportChat: {
          __typename: 'SupportChatSession',
          id,
          status: 'OPEN',
          resolved_at: null,
        },
      },
    },
  };
};

export const chatTranscriptMock = (over: {
  id?: string;
  format?: string;
  error?: string;
}): MockedResponse => {
  const id = over.id ?? 'sess-c';
  const format = over.format ?? 'TXT';
  const base = { request: { query: SUPPORT_CHAT_TRANSCRIPT, variables: { session_id: id, format } } };
  if (over.error) return { ...base, error: new Error(over.error) };
  return {
    ...base,
    result: {
      data: {
        supportChatTranscript: {
          __typename: 'SupportChatTranscript',
          filename: `support-CH-C.${format === 'DOCX' ? 'docx' : 'txt'}`,
          text: 'hi',
          content_base64: 'aGk=',
        },
      },
    },
  };
};

export const emailChatTranscriptMock = (over: {
  id?: string;
  email: string;
  format?: string;
  error?: string;
}): MockedResponse => {
  const id = over.id ?? 'sess-c';
  const format = over.format ?? 'DOCX';
  const base = {
    request: {
      query: EMAIL_SUPPORT_CHAT_TRANSCRIPT,
      variables: { session_id: id, email: over.email, format },
    },
  };
  if (over.error) return { ...base, error: new Error(over.error) };
  return { ...base, result: { data: { emailSupportChatTranscript: true } } };
};

export type SupportCreateUserResultMock = { __typename?: 'User'; user_id: string; full_name: string; email: string };

export const createUserMock = (over: {
  input: SupportCreateUserInput;
  result?: SupportCreateUserResultMock | null;
  error?: string;
}): MockedResponse => {
  const base = { request: { query: SUPPORT_CREATE_USER, variables: { input: over.input } } };
  if (over.error) return { ...base, error: new Error(over.error) };
  const supportCreateUser =
    over.result === undefined
      ? { __typename: 'User' as const, user_id: 'u1', full_name: 'Riya', email: over.input.email }
      : over.result;
  return { ...base, result: { data: { supportCreateUser } } };
};
