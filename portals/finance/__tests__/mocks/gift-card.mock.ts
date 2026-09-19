import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  GIFT_CARD_ADMIN_STATS,
  GIFT_CARD_CURRENCY,
  PUBLIC_GIFT_CARD_SETTINGS,
  UPDATE_GIFT_CARD_SETTINGS,
  type GiftCardAdminStats,
  type GiftCardCardRow,
  type GiftCardSettings,
  type GiftCardTxnRow,
} from '../../src/pages/finance/gift-cards/queries';

/**
 * Finance > Gift Cards mocks: the dashboard stats and sales policy through
 * Apollo; the card book and the ledger reach the stubbed table through
 * `tableControls`, so their rows are plain factories.
 */

export const makeGiftCardMonth = (month: string, sold: number, redeemed: number) => ({
  __typename: 'GiftCardMonthBucket' as const,
  month,
  sold,
  redeemed,
});

export const makeGiftCardStats = (
  over: Partial<GiftCardAdminStats> = {},
): { __typename: 'GiftCardAdminStats' } & GiftCardAdminStats => ({
  __typename: 'GiftCardAdminStats',
  sold_count: 24,
  sold_value: 36000,
  redeemed_count: 10,
  redeemed_value: 15000,
  outstanding_value: 19000,
  expired_value: 2000,
  validity_months: 12,
  currency_symbol: '₹',
  monthly: [makeGiftCardMonth('2026-07', 8, 3), makeGiftCardMonth('2026-08', 16, 7)],
  ...over,
});

export const giftCardStatsMock = (months: number, stats = makeGiftCardStats()): MockedResponse => ({
  request: { query: GIFT_CARD_ADMIN_STATS, variables: { months } },
  result: { data: { giftCardAdminStats: stats } },
  maxUsageCount: 10,
});

export const giftCardStatsErrorMock = (months = 12): MockedResponse => ({
  request: { query: GIFT_CARD_ADMIN_STATS, variables: { months } },
  error: new Error('gift card stats unavailable'),
});

export const makeGiftCardSettings = (
  over: Partial<GiftCardSettings> = {},
): { __typename: 'GiftCardSettings' } & GiftCardSettings => ({
  __typename: 'GiftCardSettings',
  denominations: [500, 1000, 2000],
  min_amount: 250,
  max_amount: 10000,
  validity_months: 12,
  updated_at: '2026-08-01T00:00:00.000Z',
  ...over,
});

export const giftCardSettingsMock = (settings = makeGiftCardSettings()): MockedResponse => ({
  request: { query: PUBLIC_GIFT_CARD_SETTINGS },
  result: { data: { publicGiftCardSettings: settings } },
  maxUsageCount: 10,
});

export const giftCardSettingsErrorMock = (): MockedResponse => ({
  request: { query: PUBLIC_GIFT_CARD_SETTINGS },
  error: new Error('policy unavailable'),
});

export const updateGiftCardSettingsMock = (fail = false): MockedResponse => ({
  request: { query: UPDATE_GIFT_CARD_SETTINGS, variables: () => true },
  result: fail
    ? { errors: [new GraphQLError('max_amount must be above min_amount')] }
    : { data: { updateGiftCardSettings: makeGiftCardSettings({ denominations: [500, 1500] }) } },
  maxUsageCount: 10,
});

export const giftCardCurrencyMock = (symbol = '₹'): MockedResponse => ({
  request: { query: GIFT_CARD_CURRENCY },
  result: {
    data: { publicFinanceSettings: { __typename: 'PublicFinanceSettings', currency_symbol: symbol } },
  },
  maxUsageCount: 10,
});

export const makeGiftCardRow = (over: Partial<GiftCardCardRow> = {}): GiftCardCardRow => ({
  id: 'gc-1',
  code: 'DUN-GC-7Q2X',
  scope_type: 'CATEGORY',
  scope_category_id: 'cat-sports',
  scope_name: 'Sports',
  scope_image_url: 'https://cdn.duncit.com/gift/sports.jpg',
  initial_amount: 1500,
  balance: 1500,
  status: 'ACTIVE',
  recipient_email: 'meera@duncit.com',
  recipient_name: 'Meera',
  redeemed: false,
  redeemed_at: null,
  expires_at: '2099-08-01T00:00:00.000Z',
  created_at: '2026-08-01T10:00:00.000Z',
  purchaser_name: 'Asha Rao',
  purchaser_email: 'asha@duncit.com',
  redeemer_name: '',
  redeemer_email: '',
  payment_id: 'pay_gc_1',
  ...over,
});

export const makeGiftCardTxn = (over: Partial<GiftCardTxnRow> = {}): GiftCardTxnRow => ({
  id: 'gct-1',
  gift_card_id: 'gc-1',
  code: 'DUN-GC-7Q2X',
  user_id: 'u-1',
  user_name: 'Asha Rao',
  user_email: 'asha@duncit.com',
  type: 'ISSUE',
  amount: 1500,
  balance_after: 1500,
  source: 'PURCHASE',
  payment_id: 'pay_gc_1',
  created_at: '2026-08-01T10:00:00.000Z',
  ...over,
});
