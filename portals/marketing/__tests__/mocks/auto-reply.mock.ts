import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  CREATE_SOCIAL_AUTO_REPLY_RULE,
  DELETE_SOCIAL_AUTO_REPLY_RULE,
  UPDATE_SOCIAL_AUTO_REPLY_RULE,
  type SocialAutoReplyRule,
  type SocialAutoReplyRuleInput,
} from '../../src/pages/social-accounts-page/auto-replies/autoReply.queries';

/** Auto-reply rule mocks: table rows go to the mocked `@duncit/table`; mutations through Apollo. */
export const makeAutoReplyRule = (over: Partial<SocialAutoReplyRule> = {}): SocialAutoReplyRule => ({
  id: 'r1',
  name: 'Price',
  kind: 'KEYWORD',
  keywords: ['PRICE'],
  reply_text: 'Passes start at ₹299.',
  account_ids: [],
  trusted: false,
  enabled: true,
  sent_7d: 3,
  updated_at: '2026-11-24T10:00:00.000Z',
  ...over,
});

const typed = (rule: SocialAutoReplyRule) => ({ __typename: 'SocialAutoReplyRule', ...rule });
const rejection = (message: string) => ({ result: { errors: [new GraphQLError(message)] } });

export const createAutoReplyRuleMock = (input: SocialAutoReplyRuleInput, rule = makeAutoReplyRule({ ...input, id: 'r9' })): MockedResponse => ({
  request: { query: CREATE_SOCIAL_AUTO_REPLY_RULE, variables: { input } },
  result: { data: { createSocialAutoReplyRule: typed(rule) } },
});

export const createAutoReplyRuleErrorMock = (input: SocialAutoReplyRuleInput, message: string): MockedResponse => ({
  request: { query: CREATE_SOCIAL_AUTO_REPLY_RULE, variables: { input } },
  ...rejection(message),
});

export const updateAutoReplyRuleMock = (id: string, input: SocialAutoReplyRuleInput): MockedResponse => ({
  request: { query: UPDATE_SOCIAL_AUTO_REPLY_RULE, variables: { id, input } },
  result: { data: { updateSocialAutoReplyRule: typed(makeAutoReplyRule({ ...input, id })) } },
});

export const deleteAutoReplyRuleMock = (id: string): MockedResponse => ({
  request: { query: DELETE_SOCIAL_AUTO_REPLY_RULE, variables: { id } },
  result: { data: { deleteSocialAutoReplyRule: true } },
});

export const deleteAutoReplyRuleErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: DELETE_SOCIAL_AUTO_REPLY_RULE, variables: { id } },
  ...rejection(message),
});
