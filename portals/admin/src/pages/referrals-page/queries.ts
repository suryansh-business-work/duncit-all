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

export const REFERRALS_TABLE = gql`
  query AdminReferralsTable($query: TableQueryInput) {
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
  query AdminReferralSettings {
    referralSettings {
      gift_description
    }
  }
`;

export const UPDATE_GIFT = gql`
  mutation UpdateReferralGift($gift_description: String!) {
    updateReferralGift(gift_description: $gift_description) {
      gift_description
    }
  }
`;
