import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  REFERRAL_SETTINGS,
  UPDATE_REFERRAL_SETTINGS,
  type ReferralRow,
  type ReferralSettings,
} from '../../src/pages/finance/referrals-page/queries';

/** Finance > Referrals mocks. The log reaches the stubbed table through `tableControls`. */

export const makeReferralSettings = (
  over: Partial<ReferralSettings> = {},
): { __typename: 'ReferralSettings' } & ReferralSettings => ({
  __typename: 'ReferralSettings',
  gift_description: 'Both of you get coins to spend on your next pod.',
  coins_per_referral: 50,
  share_message: 'Join me on Duncit with {link} — we both get {coins} coins.',
  ...over,
});

export const referralSettingsMock = (settings = makeReferralSettings(), delay = 0): MockedResponse => ({
  request: { query: REFERRAL_SETTINGS },
  result: { data: { referralSettings: settings } },
  delay,
  maxUsageCount: 10,
});

export const updateReferralSettingsMock = (
  over: { fail?: boolean; delay?: number } = {},
): MockedResponse => ({
  request: { query: UPDATE_REFERRAL_SETTINGS, variables: () => true },
  result: over.fail
    ? { errors: [new GraphQLError('The share message must carry {link}.')] }
    : { data: { updateReferralSettings: makeReferralSettings() } },
  delay: over.delay ?? 0,
  maxUsageCount: 10,
});

export const makeReferralRow = (over: Partial<ReferralRow> = {}): ReferralRow => ({
  id: 'ref-1',
  code: 'DUN-4C7B1E',
  referrer_user_id: 'u-1',
  referrer_name: 'Asha Rao',
  referred_user_id: 'u-2',
  referred_name: 'Ravi Kumar',
  created_at: '2026-08-01T10:00:00.000Z',
  ...over,
});
