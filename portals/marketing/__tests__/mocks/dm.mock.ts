import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  ASSIGN_SOCIAL_CONVERSATION,
  CREATE_LEAD_FROM_SOCIAL_CONVERSATION,
  MARK_SOCIAL_CONVERSATION_READ,
  SEND_SOCIAL_MESSAGE,
  SET_SOCIAL_CONVERSATION_STATUS,
  SOCIAL_CONVERSATION,
  SOCIAL_DM_SUMMARY,
  SUGGEST_SOCIAL_MESSAGE,
  type SocialConversation,
  type SocialConversationThread,
  type SocialInboxItem,
  type SocialMessage,
} from '../../src/pages/inbox-page/dm.queries';
import { SOCIAL_INBOX_COMMENT, type InboxComment, type SocialInboxStatus, type SocialInboxSummary } from '../../src/pages/inbox-page/queries';
import { SOCIAL_SETTINGS, UPDATE_SOCIAL_SETTINGS, type SocialSettings, type SocialSettingsInput } from '../../src/pages/social-accounts-page/settings/settings.queries';

export const makeConversation = (over: Partial<SocialConversation> = {}): SocialConversation => ({
  id: 'dm1',
  account_id: 'sa1',
  account_name: 'Duncit IG',
  platform: 'INSTAGRAM',
  participant: { username: 'asha.k', name: 'Asha K', avatar_url: 'https://cdn/asha.jpg' },
  last_message_at: '2026-11-24T10:00:00.000Z',
  last_inbound_at: '2026-11-24T10:00:00.000Z',
  last_message_text: 'Is Sunday full?',
  unread_count: 2,
  status: 'OPEN',
  assigned_user_id: null,
  assigned_name: null,
  ai_sentiment: 'NEUTRAL',
  ai_severity: null,
  opted_out: false,
  ig_lead_id: null,
  marketing_lead_id: null,
  window_state: 'OPEN',
  window_closes_at: '2026-11-25T10:00:00.000Z',
  ...over,
});

export const makeDmMessage = (over: Partial<SocialMessage> = {}): SocialMessage => ({
  id: 'm1',
  direction: 'IN',
  text: 'Is Sunday full?',
  attachments: [],
  sent_at: '2026-11-24T10:00:00.000Z',
  status: 'RECEIVED',
  error: '',
  sent_by_name: '',
  automated: false,
  tag: '',
  ...over,
});

export const makeThread = (over: Partial<SocialConversationThread> = {}, conversation: Partial<SocialConversation> = {}): SocialConversationThread => ({
  conversation: makeConversation(conversation),
  messages: [makeDmMessage()],
  missing_permission: null,
  max_length: 1000,
  ...over,
});

/** The thread as GraphQL sends it, typenames on every object. */
export const gqlThread = (thread: SocialConversationThread) => ({
  __typename: 'SocialConversationThread',
  ...thread,
  conversation: {
    __typename: 'SocialConversation',
    ...thread.conversation,
    participant: { __typename: 'SocialConversationParticipant', ...thread.conversation.participant },
  },
  messages: thread.messages.map((message) => ({
    __typename: 'SocialMessage',
    ...message,
    attachments: message.attachments.map((attachment) => ({ __typename: 'SocialMessageAttachment', ...attachment })),
  })),
});

const rejection = (message: string) => ({ result: { errors: [new GraphQLError(message)] } });

export const dmSummaryMock = (summary: SocialInboxSummary = { open: 4, flagged: 1, unassigned: 2, mine: 1 }): MockedResponse => ({
  request: { query: SOCIAL_DM_SUMMARY },
  result: { data: { socialDmSummary: { __typename: 'SocialInboxSummary', ...summary } } },
});

export const dmSummaryErrorMock = (message: string): MockedResponse => ({ request: { query: SOCIAL_DM_SUMMARY }, ...rejection(message) });

export const conversationMock = (thread: SocialConversationThread = makeThread()): MockedResponse => ({
  request: { query: SOCIAL_CONVERSATION, variables: { id: thread.conversation.id } },
  result: { data: { socialConversation: gqlThread(thread) } },
});

export const conversationErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: SOCIAL_CONVERSATION, variables: { id } },
  ...rejection(message),
});

export const markReadMock = (thread: SocialConversationThread): MockedResponse => ({
  request: { query: MARK_SOCIAL_CONVERSATION_READ, variables: { id: thread.conversation.id } },
  result: { data: { markSocialConversationRead: gqlThread(thread) } },
});

export const sendMessageMock = (id: string, text: string, thread: SocialConversationThread): MockedResponse => ({
  request: { query: SEND_SOCIAL_MESSAGE, variables: { id, text } },
  result: { data: { sendSocialMessage: gqlThread(thread) } },
});

export const sendMessageErrorMock = (id: string, text: string, message: string): MockedResponse => ({
  request: { query: SEND_SOCIAL_MESSAGE, variables: { id, text } },
  ...rejection(message),
});

export const suggestMessageMock = (id: string, text: string): MockedResponse => ({
  request: { query: SUGGEST_SOCIAL_MESSAGE, variables: { id } },
  result: { data: { suggestSocialMessage: { __typename: 'SocialReplySuggestion', text, run_id: 'run1' } } },
});

export const suggestMessageErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: SUGGEST_SOCIAL_MESSAGE, variables: { id } },
  ...rejection(message),
});

export const assignConversationMock = (id: string, userId: string | null, thread: SocialConversationThread): MockedResponse => ({
  request: { query: ASSIGN_SOCIAL_CONVERSATION, variables: { id, user_id: userId } },
  result: { data: { assignSocialConversation: gqlThread(thread) } },
});

export const setConversationStatusMock = (id: string, status: SocialInboxStatus, thread: SocialConversationThread): MockedResponse => ({
  request: { query: SET_SOCIAL_CONVERSATION_STATUS, variables: { id, status } },
  result: { data: { setSocialConversationStatus: gqlThread(thread) } },
});

export const createConversationLeadMock = (id: string, thread: SocialConversationThread, merged = false): MockedResponse => ({
  request: { query: CREATE_LEAD_FROM_SOCIAL_CONVERSATION, variables: { id } },
  result: { data: { createLeadFromSocialConversation: { __typename: 'SocialConversationLead', lead_id: 'lead1', merged, thread: gqlThread(thread) } } },
});

export const createConversationLeadErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: CREATE_LEAD_FROM_SOCIAL_CONVERSATION, variables: { id } },
  ...rejection(message),
});

export const inboxCommentMock = (comment: InboxComment): MockedResponse => ({
  request: { query: SOCIAL_INBOX_COMMENT, variables: { id: comment.id } },
  result: {
    data: {
      socialInboxComment: { __typename: 'SocialComment', ...comment, replies: comment.replies.map((reply) => ({ __typename: 'SocialCommentReply', ...reply })) },
    },
  },
});

export const inboxCommentErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: SOCIAL_INBOX_COMMENT, variables: { id } },
  ...rejection(message),
});

export const makeInboxItem = (over: Partial<SocialInboxItem> = {}): SocialInboxItem => ({
  id: 'dm1',
  kind: 'DM',
  platform: 'INSTAGRAM',
  account_id: 'sa1',
  account_name: 'Duncit IG',
  author: 'Asha K',
  text: 'Is Sunday full?',
  status: 'OPEN',
  ai_sentiment: 'NEUTRAL',
  ai_severity: null,
  assigned_name: null,
  at: '2026-11-24T10:00:00.000Z',
  unread_count: 2,
  ...over,
});

export const makeSocialSettings = (over: Partial<SocialSettings> = {}): SocialSettings => ({
  sync_every_hours: 3,
  backfill_days: 30,
  expiry_alert_days: 7,
  auto_triage: true,
  link_dms_to_leads: true,
  default_assignee_user_id: null,
  default_assignee_name: null,
  opt_out_keywords: ['STOP', 'UNSUBSCRIBE'],
  opt_in_keywords: ['START'],
  auto_reply_enabled: false,
  auto_reply_daily_cap: 50,
  auto_reply_requires_approval: true,
  ai_reply_guidelines: '',
  ...over,
});

export const socialSettingsMock = (settings: SocialSettings = makeSocialSettings()): MockedResponse => ({
  request: { query: SOCIAL_SETTINGS },
  result: { data: { socialSettings: { __typename: 'SocialSettings', ...settings } } },
});

export const socialSettingsErrorMock = (message: string): MockedResponse => ({ request: { query: SOCIAL_SETTINGS }, ...rejection(message) });

export const updateSocialSettingsMock = (input: SocialSettingsInput, saved: SocialSettings): MockedResponse => ({
  request: { query: UPDATE_SOCIAL_SETTINGS, variables: { input } },
  result: { data: { updateSocialSettings: { __typename: 'SocialSettings', ...saved } } },
});

export const updateSocialSettingsErrorMock = (input: SocialSettingsInput, message: string): MockedResponse => ({
  request: { query: UPDATE_SOCIAL_SETTINGS, variables: { input } },
  ...rejection(message),
});
