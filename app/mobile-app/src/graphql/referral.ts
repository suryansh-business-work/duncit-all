import { gql } from '@/generated/graphql';

/** My referral code + gift + redemptions — mWeb's MY_REFERRAL. */
export const MyReferralDocument = gql(`
  query MobileMyReferral {
    myReferral {
      code
      gift_description
      referred_by_name
      referred {
        user_id
        full_name
        referred_at
      }
    }
  }
`);

/** Redeem a friend's code (once per account). */
export const ApplyReferralCodeDocument = gql(`
  mutation MobileApplyReferralCode($code: String!) {
    applyReferralCode(code: $code) {
      code
      referred_by_name
    }
  }
`);
