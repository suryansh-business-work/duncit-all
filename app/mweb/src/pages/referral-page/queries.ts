import { gql } from '@apollo/client';

export interface ReferredEntry {
  user_id: string;
  full_name: string | null;
  referred_at: string;
}

export interface MyReferral {
  code: string;
  gift_description: string;
  coins_per_referral: number;
  share_message: string;
  referred_by_name: string | null;
  referred: ReferredEntry[];
}

export const MY_REFERRAL = gql`
  query MyReferral {
    myReferral {
      code
      gift_description
      coins_per_referral
      share_message
      referred_by_name
      referred {
        user_id
        full_name
        referred_at
      }
    }
  }
`;
