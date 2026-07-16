import type { MockedResponse } from '@apollo/client/testing';
import type { FinanceSettings } from '@duncit/gql-types';
import { PAYOUT_SETTINGS, UPDATE_PAYOUT_SETTINGS } from '../../src/pages/finance/payout-cycles-page/queries';

/** Payout-cycle slice of `financeSettings` (schema-synced `Pick`). */
export type PayoutSettings = { __typename?: 'FinanceSettings' } & Pick<
  FinanceSettings,
  'venue_payout_mode' | 'host_payout_mode' | 'payout_day_of_week' | 'payout_time' | 'updated_at'
>;

export const makePayoutSettings = (over: Partial<PayoutSettings> = {}): PayoutSettings => ({
  __typename: 'FinanceSettings',
  venue_payout_mode: 'WEEKLY',
  host_payout_mode: 'IMMEDIATE',
  payout_day_of_week: 1,
  payout_time: '09:30',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

export const payoutSettingsMock = (
  settings: PayoutSettings | null = makePayoutSettings(),
): MockedResponse => ({
  request: { query: PAYOUT_SETTINGS },
  result: { data: { financeSettings: settings } },
  maxUsageCount: 20,
});

export const payoutSettingsLoadingMock = (): MockedResponse => ({
  request: { query: PAYOUT_SETTINGS },
  result: { data: { financeSettings: makePayoutSettings() } },
  delay: 60_000,
});

export const updatePayoutSettingsMock = (
  over: { fail?: boolean; delay?: number } = {},
): MockedResponse => ({
  request: { query: UPDATE_PAYOUT_SETTINGS },
  variableMatcher: () => true,
  ...(over.delay ? { delay: over.delay } : {}),
  ...(over.fail
    ? { error: new Error('save failed') }
    : { result: { data: { updateFinanceSettings: makePayoutSettings() } } }),
});
