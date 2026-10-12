import type { MockedResponse } from '@apollo/client/testing';
import type {
  MailAutomationAccount,
  MailAutomationPreview,
  MailAutomationThread,
} from '@duncit/gql-types';
import {
  MAIL_AUTOMATION_ACCOUNTS,
  MAIL_AUTOMATION_PREVIEW,
  MAIL_AUTOMATION_THREADS,
  UPDATE_MAIL_AUTOMATION_RULE,
} from '../../src/graphql/mail-automation';

/**
 * Mail Automation mocks: the connected mailboxes Support writes rules for, the
 * threads a mailbox has answered, the reply preview and the rule update. All
 * typed from the generated schema and carrying `__typename`.
 */
const ISO = '2026-03-04T09:30:00.000Z';

export type MailboxMock = Pick<
  MailAutomationAccount,
  | 'id'
  | 'email'
  | 'display_name'
  | 'is_active'
  | 'reply_template'
  | 'ai_enabled'
  | 'ticket_type'
  | 'sla_min_hours'
  | 'sla_max_hours'
  | 'sla_label'
  | 'is_connected'
  | 'last_polled_at'
  | 'last_error'
  | 'connected_at'
> & { __typename: 'MailAutomationAccount' };

export const makeMailbox = (over: Partial<MailboxMock> = {}): MailboxMock => ({
  __typename: 'MailAutomationAccount',
  id: 'ma-1',
  email: 'help@duncit.com',
  display_name: 'Duncit Help',
  is_active: true,
  reply_template: 'Thanks for writing. Your reference is {{ticket_no}}.',
  ai_enabled: false,
  ticket_type: 'SUPPORT',
  sla_min_hours: 24,
  sla_max_hours: 48,
  sla_label: '24-48 hours',
  is_connected: true,
  last_polled_at: ISO,
  last_error: '',
  connected_at: ISO,
  ...over,
});

export const mailboxesMock = (rows: MailboxMock[] = [makeMailbox()]): MockedResponse => ({
  request: { query: MAIL_AUTOMATION_ACCOUNTS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { mailAutomationAccounts: rows } },
});

export const mailboxesErrorMock = (message: string): MockedResponse => ({
  request: { query: MAIL_AUTOMATION_ACCOUNTS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { errors: [{ message }] },
});

export type MailThreadMock = Pick<
  MailAutomationThread,
  | 'id'
  | 'from_email'
  | 'from_name'
  | 'subject'
  | 'ticket_type'
  | 'ticket_no'
  | 'replied_at'
  | 'reply_error'
  | 'reply_by_ai'
  | 'created_at'
> & { __typename: 'MailAutomationThread' };

export const makeMailThread = (over: Partial<MailThreadMock> = {}): MailThreadMock => ({
  __typename: 'MailAutomationThread',
  id: 'th-1',
  from_email: 'asha@example.com',
  from_name: 'Asha Rao',
  subject: 'Refund for my pod',
  ticket_type: 'SUPPORT',
  ticket_no: 'TKT-000101',
  replied_at: ISO,
  reply_error: '',
  reply_by_ai: false,
  created_at: ISO,
  ...over,
});

export const mailThreadsMock = (
  rows: MailThreadMock[] = [],
  accountId = 'ma-1',
): MockedResponse => ({
  request: { query: MAIL_AUTOMATION_THREADS, variables: { account_id: accountId, limit: 100 } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { mailAutomationThreads: rows } },
});

type Matches = (variables: Record<string, unknown>) => boolean;

/** The reply preview; answers only when the draft it was sent passes `matches`. */
export const mailPreviewMock = (
  preview: Pick<MailAutomationPreview, 'text' | 'by_ai'> = { text: 'Hello Asha', by_ai: false },
  matches: Matches = () => true,
): MockedResponse => ({
  request: { query: MAIL_AUTOMATION_PREVIEW, variables: matches },
  result: { data: { mailAutomationPreview: { __typename: 'MailAutomationPreview', ...preview } } },
});

export const mailPreviewErrorMock = (message: string): MockedResponse => ({
  request: { query: MAIL_AUTOMATION_PREVIEW, variables: () => true },
  result: { errors: [{ message }] },
});

/** The rule update; answers only when its variables pass `matches`. */
export const updateMailRuleMock = (
  matches: Matches = () => true,
  fail?: string,
): MockedResponse => ({
  request: { query: UPDATE_MAIL_AUTOMATION_RULE, variables: matches },
  result:
    fail === undefined
      ? { data: { updateMailAutomationRule: makeMailbox() } }
      : { errors: [{ message: fail }] },
});
