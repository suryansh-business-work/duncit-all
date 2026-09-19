import type { MockedResponse } from '@apollo/client/testing';
import {
  MAIL_PREFERENCE_ANALYTICS,
  type MailPreferenceAnalytics,
  type MailPreferenceLogRow,
} from '../../src/pages/mail-preference-analytics-page/queries';

/**
 * Mail Preference Analytics mocks. Change-log rows feed the mocked
 * `@duncit/table` directly; the summary flows through `MockedProvider`, keyed
 * on the range it was asked for, so it carries `__typename`.
 */
export const makeMailPreferenceLogRow = (
  over: Partial<MailPreferenceLogRow> = {},
): MailPreferenceLogRow => ({
  id: 'mpl1',
  email: 'asha@example.com',
  user_id: 'u1',
  user_name: 'Asha Rao',
  category: 'marketing',
  enabled: false,
  source: 'MWEB',
  source_detail: 'Mail Preference page',
  created_at: '2026-09-10T09:00:00.000Z',
  ...over,
});

export const makeMailPreferenceAnalytics = (
  over: Partial<MailPreferenceAnalytics> = {},
): MailPreferenceAnalytics => ({
  range_days: 30,
  people_opted_out: 12,
  people_opted_out_all: 3,
  opt_outs: 18,
  opt_ins: 5,
  by_category: [{ category: 'marketing', opted_out_now: 12, opt_outs: 18, opt_ins: 5 }],
  by_source: [{ key: 'MWEB', count: 16 }],
  ...over,
});

export const mailPreferenceAnalyticsMock = (
  summary: MailPreferenceAnalytics = makeMailPreferenceAnalytics(),
): MockedResponse => ({
  request: { query: MAIL_PREFERENCE_ANALYTICS, variables: { range_days: summary.range_days } },
  result: {
    data: {
      mailPreferenceAnalytics: {
        __typename: 'MailPreferenceAnalytics',
        ...summary,
        by_category: summary.by_category.map((row) => ({
          __typename: 'MailPreferenceCategoryStat',
          ...row,
        })),
        by_source: summary.by_source.map((row) => ({ __typename: 'MailPreferenceBucket', ...row })),
      },
    },
  },
  maxUsageCount: 5,
});
