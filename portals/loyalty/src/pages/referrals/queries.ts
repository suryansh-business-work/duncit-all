import { gql } from '@apollo/client';

/** Whether both sides of a referral were credited their coins. */
export type ReferralPayoutStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

/** One redeemed code: who shared it, who signed up with it, and what followed. */
export interface ReferralRow {
  id: string;
  code: string;
  referrer_user_id: string;
  referrer_name: string | null;
  referrer_email: string | null;
  referred_user_id: string;
  referred_name: string | null;
  referred_email: string | null;
  referrer_coins: number;
  referred_coins: number;
  payout_status: ReferralPayoutStatus;
  /** True once the member who signed up has paid for anything. */
  converted: boolean;
  created_at: string;
}

/** One member's code and what it has brought in. */
export interface ReferrerRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  code: string;
  created_at: string;
  joined: number;
  converted: number;
  coins_earned: number;
  last_referral_at: string | null;
}

export interface ReferralSettings {
  gift_description: string;
  /** Read-only here — it is a coin payout rule, set on Duncit Coin > Coin Settings. */
  coins_per_referral: number;
  share_message: string;
}

export interface ReferralMonthBucket {
  month: string;
  joined: number;
  converted: number;
  coins: number;
}

export interface TopReferrer {
  user_id: string;
  name: string;
  email: string;
  code: string;
  joined: number;
  converted: number;
  coins: number;
}

export interface ReferralAdminStats {
  codes_issued: number;
  active_referrers: number;
  idle_codes: number;
  total_referrals: number;
  converted: number;
  awaiting_first_payment: number;
  conversion_pct: number;
  coins_paid: number;
  referrer_coins: number;
  new_member_coins: number;
  payouts_paid: number;
  payouts_partial: number;
  payouts_unpaid: number;
  coins_per_referral: number;
  monthly: ReferralMonthBucket[];
  top_referrers: TopReferrer[];
}

// Operation names kept from the Finance console, so request intercepts and
// saved monitors that match on them still do.
export const REFERRALS_TABLE = gql`
  query FinanceReferralsTable($query: TableQueryInput) {
    referralsTable(query: $query) {
      total
      rows {
        id
        code
        referrer_user_id
        referrer_name
        referrer_email
        referred_user_id
        referred_name
        referred_email
        referrer_coins
        referred_coins
        payout_status
        converted
        created_at
      }
    }
  }
`;

export const REFERRERS_TABLE = gql`
  query LoyaltyReferrersTable($query: TableQueryInput) {
    referrersTable(query: $query) {
      total
      rows {
        id
        user_id
        name
        email
        code
        created_at
        joined
        converted
        coins_earned
        last_referral_at
      }
    }
  }
`;

export const REFERRAL_SETTINGS = gql`
  query FinanceReferralSettings {
    referralSettings {
      gift_description
      coins_per_referral
      share_message
    }
  }
`;

export const UPDATE_REFERRAL_SETTINGS = gql`
  mutation UpdateReferralSettings($input: ReferralSettingsInput!) {
    updateReferralSettings(input: $input) {
      gift_description
      coins_per_referral
      share_message
    }
  }
`;

export const REFERRAL_ADMIN_STATS = gql`
  query LoyaltyReferralStats($months: Int) {
    referralAdminStats(months: $months) {
      codes_issued
      active_referrers
      idle_codes
      total_referrals
      converted
      awaiting_first_payment
      conversion_pct
      coins_paid
      referrer_coins
      new_member_coins
      payouts_paid
      payouts_partial
      payouts_unpaid
      coins_per_referral
      monthly {
        month
        joined
        converted
        coins
      }
      top_referrers {
        user_id
        name
        email
        code
        joined
        converted
        coins
      }
    }
  }
`;
