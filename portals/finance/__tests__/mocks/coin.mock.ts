import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  ADJUST_USER_COINS,
  COIN_ADMIN_STATS,
  COIN_CURRENCY,
  COIN_POD_BY_ID,
  COIN_POD_PICKER,
  COIN_SETTINGS,
  COIN_USER_SEARCH,
  UPDATE_COIN_SETTINGS,
  type CoinAdminStats,
  type CoinSettings,
  type CoinTxnRow,
  type CoinUserOption,
  type PodOption,
} from '../../src/pages/finance/duncit-coin/queries';

/**
 * Finance > Duncit Coin mocks: the dashboard stats, the settings form and its
 * one-off grant card, and the ledger's pod filter. Ledger rows themselves reach
 * the stubbed table through `tableControls`, so they are plain factories.
 */

export const makeCoinMonth = (month: string, earned: number, redeemed: number) => ({
  __typename: 'CoinMonthBucket' as const,
  month,
  earned,
  redeemed,
});

export const makeCoinStats = (
  over: Partial<CoinAdminStats> = {},
): { __typename: 'CoinAdminStats' } & CoinAdminStats => ({
  __typename: 'CoinAdminStats',
  total_circulated: 5000,
  total_redeemed: 1200,
  total_outstanding: 3800,
  wallet_balance_total: 3800,
  transaction_count: 42,
  holders_count: 17,
  earn_pct: 5,
  shop_earn_pct: 3,
  currency_symbol: '₹',
  monthly: [makeCoinMonth('2026-07', 900, 150), makeCoinMonth('2026-08', 1100, 300)],
  ...over,
});

export const coinStatsMock = (months: number, stats = makeCoinStats()): MockedResponse => ({
  request: { query: COIN_ADMIN_STATS, variables: { months } },
  result: { data: { coinAdminStats: stats } },
  maxUsageCount: 10,
});

export const coinStatsErrorMock = (months = 12): MockedResponse => ({
  request: { query: COIN_ADMIN_STATS, variables: { months } },
  error: new Error('coin stats unavailable'),
});

export const makeCoinSettings = (
  over: Partial<CoinSettings> = {},
): { __typename: 'CoinSettings' } & CoinSettings => ({
  __typename: 'CoinSettings',
  pod_join_earn_pct: 5,
  shop_earn_pct: 3,
  coins_per_referral: 50,
  pod_feedback_coins: 10,
  coin_expiry_days: 365,
  updated_at: '2026-08-25T00:00:00.000Z',
  ...over,
});

export const coinSettingsMock = (settings = makeCoinSettings(), delay = 0): MockedResponse => ({
  request: { query: COIN_SETTINGS },
  result: { data: { coinSettings: settings } },
  delay,
  maxUsageCount: 10,
});

export const coinCurrencyMock = (symbol = '₹'): MockedResponse => ({
  request: { query: COIN_CURRENCY },
  result: {
    data: { publicFinanceSettings: { __typename: 'PublicFinanceSettings', currency_symbol: symbol } },
  },
  maxUsageCount: 10,
});

/** A refused write is a GraphQL error, the way the server refuses it. */
export const updateCoinSettingsMock = (
  over: { fail?: boolean; delay?: number } = {},
): MockedResponse => ({
  request: { query: UPDATE_COIN_SETTINGS, variables: () => true },
  result: over.fail
    ? { errors: [new GraphQLError('A rate cannot go above 100%.')] }
    : { data: { updateCoinSettings: makeCoinSettings({ shop_earn_pct: 4 }) } },
  delay: over.delay ?? 0,
  maxUsageCount: 10,
});

export const makeCoinUser = (over: Partial<CoinUserOption> = {}): { __typename: 'CoinUserOption' } & CoinUserOption => ({
  __typename: 'CoinUserOption',
  id: 'u-1',
  full_name: 'Asha Rao',
  email: 'asha@duncit.com',
  balance: 120,
  ...over,
});

export const coinUserSearchMock = (term: string, users = [makeCoinUser()]): MockedResponse => ({
  request: { query: COIN_USER_SEARCH, variables: { term } },
  result: { data: { coinUserSearch: users } },
  maxUsageCount: 10,
});

export const adjustUserCoinsMock = (
  over: { fail?: boolean; delay?: number; balance?: number } = {},
): MockedResponse => ({
  request: { query: ADJUST_USER_COINS, variables: () => true },
  result: over.fail
    ? { errors: [new GraphQLError('A deduction cannot take a balance below zero.')] }
    : {
        data: {
          adjustUserCoins: {
            __typename: 'CoinAdjustResult',
            user_id: 'u-1',
            balance: over.balance ?? 170,
            lifetime_earned: 900,
            applied: 50,
          },
        },
      },
  delay: over.delay ?? 0,
  maxUsageCount: 10,
});

export const makePodOption = (over: Partial<PodOption> = {}): { __typename: 'Pod' } & PodOption => ({
  __typename: 'Pod',
  id: 'pod-doc-1',
  pod_id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton',
  club_slug: 'smash-club',
  ...over,
});

export const coinPodPickerMock = (rows = [makePodOption()]): MockedResponse => ({
  request: { query: COIN_POD_PICKER, variables: () => true },
  result: { data: { podsTable: { __typename: 'PodTablePage', rows } } },
  maxUsageCount: 20,
});

export const coinPodByIdMock = (pod = makePodOption()): MockedResponse => ({
  request: { query: COIN_POD_BY_ID, variables: { pod_doc_id: pod.id } },
  result: { data: { pod } },
  delay: 20,
  maxUsageCount: 10,
});

export const makeCoinTxn = (over: Partial<CoinTxnRow> = {}): CoinTxnRow => ({
  id: 'txn-1',
  user_id: 'u-1',
  user_name: 'Asha Rao',
  user_email: 'asha@duncit.com',
  admin_name: '',
  type: 'CREDIT',
  amount: 25,
  balance_after: 145,
  source: 'PAYMENT_EARN',
  reason: '',
  payment_id: 'pay_9f2',
  payment_total: 500,
  pods: [{ id: 'pod-doc-1', title: 'Sunday Badminton', slug: 'sunday-badminton' }],
  earn_pct: 5,
  spend_amount: 500,
  created_at: '2026-08-01T10:00:00.000Z',
  ...over,
});
