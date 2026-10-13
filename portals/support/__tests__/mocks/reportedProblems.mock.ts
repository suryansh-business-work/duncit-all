import type { MockedResponse } from '@apollo/client/testing';
import type {
  FeedbackReport,
  ReportProblemCategory,
  ReportProblemConfig,
  ReportProblemSlackSettings,
  SlackChannel,
} from '@duncit/gql-types';
import {
  REPORT_PROBLEM_CONFIG,
  REPORT_PROBLEM_SLACK,
  REPORTED_PROBLEM,
  REPORTED_PROBLEMS_TABLE,
  SET_REPORT_STATUS,
  UPDATE_REPORT_PROBLEM_CONFIG,
  UPDATE_REPORT_PROBLEM_SLACK,
} from '../../src/graphql/reported-problems';

/**
 * Reported-problem mocks: the report rows and detail, the app's Report a
 * Problem config and the Slack routing settings. Typed from the generated
 * schema and carrying `__typename`.
 */
const ISO = '2026-03-04T09:30:00.000Z';

export type FeedbackReportMock = Omit<FeedbackReport, '__typename'> & {
  __typename: 'FeedbackReport';
};

export const makeFeedbackReport = (over: Partial<FeedbackReportMock> = {}): FeedbackReportMock => ({
  __typename: 'FeedbackReport',
  id: 'rep-1',
  user_id: 'user-9',
  report_no: 'RPB-000041',
  user_name: 'Asha Rao',
  user_email: 'asha@example.com',
  category: 'Payments',
  message: 'The payment screen froze after I tapped Pay.',
  media_urls: [],
  reporter_phone: '+91 98765 43210',
  reporter_city: 'Bengaluru',
  reporter_locale: 'en-IN',
  reporter_roles: ['MEMBER'],
  platform: 'ANDROID',
  app_version: '4.2.0',
  device_os: 'Android 14',
  device_model: 'Pixel 8',
  source_screen: 'Checkout',
  status: 'OPEN',
  slack_ts: '1710000000.0001',
  slack_error: null,
  created_at: ISO,
  updated_at: ISO,
  ...over,
});

/** The table page; every request's variables are pushed onto `seen`. */
export const reportedProblemsTableMock = (
  rows: FeedbackReportMock[] = [makeFeedbackReport()],
): MockedResponse => ({
  request: { query: REPORTED_PROBLEMS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      reportedProblemsTable: {
        __typename: 'FeedbackReportTablePage',
        total: rows.length,
        rows,
      },
    },
  },
});

export const reportedProblemMock = (
  report: FeedbackReportMock | null,
  id = 'rep-1',
): MockedResponse => ({
  request: { query: REPORTED_PROBLEM, variables: { id } },
  result: { data: { reportedProblem: report } },
});

export const reportedProblemErrorMock = (message: string, id = 'rep-1'): MockedResponse => ({
  request: { query: REPORTED_PROBLEM, variables: { id } },
  result: { errors: [{ message }] },
});

export const setReportStatusMock = (
  id: string,
  status: FeedbackReportMock['status'],
  fail?: string,
): MockedResponse => ({
  request: { query: SET_REPORT_STATUS, variables: { id, status } },
  result:
    fail === undefined
      ? { data: { setFeedbackReportStatus: { __typename: 'FeedbackReport', id, status } } }
      : { errors: [{ message: fail }] },
});

/* ---- Report a Problem config ---- */

export type ReportProblemCategoryMock = Omit<ReportProblemCategory, '__typename'> & {
  __typename: 'ReportProblemCategory';
};

export const makeProblemCategory = (
  over: Partial<ReportProblemCategoryMock> = {},
): ReportProblemCategoryMock => ({
  __typename: 'ReportProblemCategory',
  key: 'PAYMENTS',
  label: 'Payments',
  is_active: true,
  sort_order: 0,
  ...over,
});

export type ReportProblemConfigMock = Omit<ReportProblemConfig, '__typename' | 'categories'> & {
  __typename: 'ReportProblemConfig';
  categories: ReportProblemCategoryMock[];
};

export const makeProblemConfig = (
  over: Partial<ReportProblemConfigMock> = {},
): ReportProblemConfigMock => ({
  __typename: 'ReportProblemConfig',
  categories: [
    makeProblemCategory(),
    makeProblemCategory({ key: 'BUGS', label: 'Bugs', sort_order: 1, is_active: false }),
  ],
  message_label: 'What went wrong?',
  message_hint: 'Tell us what you were doing.',
  message_min_length: 10,
  allow_media: true,
  max_media: 5,
  ...over,
});

export const problemConfigMock = (config: ReportProblemConfigMock = makeProblemConfig()): MockedResponse => ({
  request: { query: REPORT_PROBLEM_CONFIG },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { reportProblemConfig: config } },
});

type Matches = (variables: Record<string, unknown>) => boolean;

export const updateProblemConfigMock = (
  matches: Matches = () => true,
  fail?: string,
): MockedResponse => ({
  request: { query: UPDATE_REPORT_PROBLEM_CONFIG, variables: matches },
  result:
    fail === undefined
      ? { data: { updateReportProblemConfig: makeProblemConfig() } }
      : { errors: [{ message: fail }] },
});

/* ---- Slack routing ---- */

export type SlackChannelMock = Pick<SlackChannel, 'id' | 'name' | 'is_private' | 'is_member'> & {
  __typename: 'SlackChannel';
};

export const makeSlackChannel = (over: Partial<SlackChannelMock> = {}): SlackChannelMock => ({
  __typename: 'SlackChannel',
  id: 'C0001',
  name: 'support-alerts',
  is_private: false,
  is_member: true,
  ...over,
});

export type ProblemSlackMock = Pick<
  ReportProblemSlackSettings,
  'slack_configured' | 'enabled' | 'channel_id' | 'channel_name' | 'error'
> & {
  __typename: 'ReportProblemSlackSettings';
  channels: SlackChannelMock[];
};

export const makeProblemSlack = (over: Partial<ProblemSlackMock> = {}): ProblemSlackMock => ({
  __typename: 'ReportProblemSlackSettings',
  slack_configured: true,
  enabled: true,
  channel_id: 'C0001',
  channel_name: 'support-alerts',
  error: '',
  channels: [
    makeSlackChannel(),
    makeSlackChannel({ id: 'C0002', name: 'leadership', is_private: true }),
  ],
  ...over,
});

export const problemSlackMock = (settings: ProblemSlackMock = makeProblemSlack()): MockedResponse => ({
  request: { query: REPORT_PROBLEM_SLACK },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { reportProblemSlackSettings: settings } },
});

export const updateProblemSlackMock = (
  matches: Matches = () => true,
  fail?: string,
): MockedResponse => ({
  request: { query: UPDATE_REPORT_PROBLEM_SLACK, variables: matches },
  result:
    fail === undefined
      ? { data: { updateReportProblemSlack: makeProblemSlack() } }
      : { errors: [{ message: fail }] },
});

export const problemConfigErrorMock = (message: string): MockedResponse => ({
  request: { query: REPORT_PROBLEM_CONFIG },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { errors: [{ message }] },
});

export const problemSlackErrorMock = (message: string): MockedResponse => ({
  request: { query: REPORT_PROBLEM_SLACK },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { errors: [{ message }] },
});
