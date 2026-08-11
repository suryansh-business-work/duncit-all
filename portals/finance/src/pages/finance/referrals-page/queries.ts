import { gql } from '@apollo/client';

/** Row shape for the server-paged referrals log. */
export interface ReferralRow {
  id: string;
  code: string;
  referrer_user_id: string;
  referrer_name: string | null;
  referred_user_id: string;
  referred_name: string | null;
  created_at: string;
}

export interface ReferralSettings {
  gift_description: string;
  coins_per_referral: number;
  share_message: string;
}

export const REFERRALS_TABLE = gql`
  query FinanceReferralsTable($query: TableQueryInput) {
    referralsTable(query: $query) {
      total
      rows {
        id
        code
        referrer_user_id
        referrer_name
        referred_user_id
        referred_name
        created_at
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
