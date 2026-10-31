import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  ASSIGN_SOCIAL_COMMENT,
  REPLY_TO_SOCIAL_COMMENT,
  SET_SOCIAL_COMMENT_STATUS,
  SOCIAL_INBOX_SETUP,
  SOCIAL_INBOX_SUMMARY,
  SUGGEST_SOCIAL_REPLY,
  type InboxAccount,
  type InboxComment,
  type SocialCommentReply,
  type SocialInboxStatus,
  type SocialInboxSummary,
  type SocialReplyCapability,
} from '../../src/pages/inbox-page/queries';

export const makeInboxReply = (over: Partial<SocialCommentReply> = {}): SocialCommentReply => ({
  at: '2026-10-31T10:00:00.000Z',
  by_user_id: 'u1',
  by_name: 'Asha Rao',
  text: 'Yes, beginners are welcome!',
  external_id: 'r1',
  ok: true,
  error: '',
  ...over,
});

export const makeInboxComment = (over: Partial<InboxComment> = {}): InboxComment => ({
  id: 'c1',
  account_id: 'sa1',
  account_name: 'Duncit Pages',
  platform: 'INSTAGRAM',
  post_text: 'Sunday pickleball at HSR',
  post_permalink: 'https://instagram.com/p/1',
  permalink: 'https://instagram.com/p/1/c/1',
  author_name: 'Ravi',
  author_handle: 'ravi_k',
  text: 'Is this open to beginners?',
  published_at: '2026-10-30T09:00:00.000Z',
  likes: 0,
  ai_status: 'CLEAN',
  ai_sentiment: 'NEUTRAL',
  ai_categories: [],
  ai_severity: null,
  ai_reason: null,
  review_status: 'OPEN',
  status: 'OPEN',
  assigned_user_id: null,
  assigned_name: null,
  replies: [],
  last_activity_at: null,
  ...over,
});

/** The comment as GraphQL sends it, typenames on every object. */
const gqlComment = (comment: InboxComment) => ({
  __typename: 'SocialComment',
  ...comment,
  replies: comment.replies.map((reply) => ({ __typename: 'SocialCommentReply', ...reply })),
});

export const makeInboxSummary = (over: Partial<SocialInboxSummary> = {}): SocialInboxSummary => ({
  open: 12,
  flagged: 3,
  unassigned: 5,
  mine: 2,
  ...over,
});

export const inboxSummaryMock = (summary: SocialInboxSummary = makeInboxSummary()): MockedResponse => ({
  request: { query: SOCIAL_INBOX_SUMMARY },
  result: { data: { socialInboxSummary: { __typename: 'SocialInboxSummary', ...summary } } },
});

export const INBOX_ACCOUNTS: InboxAccount[] = [{ id: 'sa1', name: 'Duncit Pages', platform: 'INSTAGRAM' }];

export const makeReplyCapabilities = (): SocialReplyCapability[] => [
  { platform: 'INSTAGRAM', can_reply: true, missing_permission: null, max_length: 2200 },
  { platform: 'FACEBOOK', can_reply: false, missing_permission: 'pages_manage_engagement', max_length: 8000 },
  { platform: 'X', can_reply: true, missing_permission: null, max_length: 280 },
];

export const inboxSetupMock = (capabilities: SocialReplyCapability[] = makeReplyCapabilities()): MockedResponse => ({
  request: { query: SOCIAL_INBOX_SETUP },
  result: {
    data: {
      socialAccounts: INBOX_ACCOUNTS.map((account) => ({ __typename: 'SocialAccount', ...account })),
      socialReplyCapabilities: capabilities.map((capability) => ({ __typename: 'SocialReplyCapability', ...capability })),
    },
  },
});

const rejection = (message: string) => ({ result: { errors: [new GraphQLError(message)] } });

export const inboxSetupErrorMock = (message: string): MockedResponse => ({ request: { query: SOCIAL_INBOX_SETUP }, ...rejection(message) });

export const inboxSummaryErrorMock = (message: string): MockedResponse => ({ request: { query: SOCIAL_INBOX_SUMMARY }, ...rejection(message) });

export const assignSocialCommentMock = (id: string, userId: string | null, comment: InboxComment): MockedResponse => ({
  request: { query: ASSIGN_SOCIAL_COMMENT, variables: { id, user_id: userId } },
  result: { data: { assignSocialComment: gqlComment(comment) } },
});

export const setSocialCommentStatusMock = (id: string, status: SocialInboxStatus, comment: InboxComment): MockedResponse => ({
  request: { query: SET_SOCIAL_COMMENT_STATUS, variables: { id, status } },
  result: { data: { setSocialCommentStatus: gqlComment(comment) } },
});

export const setSocialCommentStatusErrorMock = (id: string, status: SocialInboxStatus, message: string): MockedResponse => ({
  request: { query: SET_SOCIAL_COMMENT_STATUS, variables: { id, status } },
  ...rejection(message),
});

export const replyToSocialCommentMock = (id: string, text: string, comment: InboxComment): MockedResponse => ({
  request: { query: REPLY_TO_SOCIAL_COMMENT, variables: { id, text } },
  result: { data: { replyToSocialComment: gqlComment(comment) } },
});

export const replyToSocialCommentErrorMock = (id: string, text: string, message: string): MockedResponse => ({
  request: { query: REPLY_TO_SOCIAL_COMMENT, variables: { id, text } },
  ...rejection(message),
});

export const suggestSocialReplyMock = (id: string, text: string): MockedResponse => ({
  request: { query: SUGGEST_SOCIAL_REPLY, variables: { id } },
  result: { data: { suggestSocialReply: { __typename: 'SocialReplySuggestion', text, run_id: 'run1' } } },
});

export const suggestSocialReplyErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: SUGGEST_SOCIAL_REPLY, variables: { id } },
  ...rejection(message),
});
